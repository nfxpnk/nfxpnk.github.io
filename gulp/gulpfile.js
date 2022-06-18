'use strict';

const fs = require('fs');
const path = require('path');
const gulp = require('gulp');

const log = require('fancy-log');
const c = require('ansi-colors');

const config = require('./config.json');
const configPaths = require('./config.paths.json');

const gif = require('gulp-if');
const sass = require('gulp-sass')(require('sass'));
const prefix = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const connect = require('gulp-connect');
const styleLint = require('gulp-stylelint');
const argv = require('yargs').argv;
const livereload = require('gulp-livereload');

const source = argv.source === undefined ? false : argv.source;

for (const property in configPaths) {
    if (property == 'scssInclude') continue;

    const folder = config['root'] + configPaths[property];
    log('Checking folder from config ' + c.cyan(property) + ': ' + c.yellow(folder));

    if (!fs.existsSync(folder)) {
        log("Folder doesn't exist: " + c.yellow(folder));
        log('Please check your config files: ' + c.cyan('config.json') + ' and ' + c.cyan('config.paths.json'));
        process.exit();
    }
}

//console.log(argv);

const scssSrc = config['root'] + configPaths['scssSource'];
let sourceToCompile = [scssSrc + '/*.scss'];

/*
let sourceToCompile = [];

if (source) {
    if (source == 'all') {
        sourceToCompile = [scssSrc + '/*.scss'];
    } else {
        let sources = source.split(',');
        for (let i = 0; i < sources.length; i++) {
            sourceToCompile.push(scssSrc + '/' + sources[i] + '.scss');
        }
    }
}
*/

console.log(sourceToCompile);

const sourcemapsEnabled = false;

// Lint scss file with `stylelint`
function sassLinter(file) {
    log('Verifying ' + c.yellow(file));

    return gulp.src(file).pipe(
        styleLint({
            configFile: './.stylelintrc',
            customSyntax: 'postcss-scss',
            failAfterError: false,
            reporters: [{ formatter: 'verbose', console: true }],
        })
    );
}

// Compile scss
function compileScss(sourceToCompile, dest) {
    for (let i = 0; i < sourceToCompile.length; i++) {
        log('Compiling ' + c.yellow(sourceToCompile[i]) + ' into ' + c.green(dest + '/*.css'));
    }

    return gulp
        .src(sourceToCompile)
        .pipe(gif(sourcemapsEnabled, sourcemaps.init()))
        .pipe(
            sass({
                outputStyle: 'expanded',
                includePaths: configPaths['scssInclude'],
            }).on('error', sass.logError)
        )
        .pipe(
            prefix({
                overrideBrowserslist: ['last 2 versions'],
                cascade: true,
            })
        )
        .pipe(gif(sourcemapsEnabled, sourcemaps.write('./')))
        .pipe(gulp.dest(dest));
}

function compileProjectScss() {
    return compileScss(sourceToCompile, config['root'] + configPaths['cssDestination']);
}

const cors = (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
};

function connectLiveReload() {
    livereload.listen();

    return connect.server({
        root: config['root'] + configPaths['httpRoot'],
        https: true,
        port: 9081,
        host: '0.0.0.0',
        /*livereload: {
            start: true,
            //port: 9000,
            hostname: '127.0.0.1',
        },*/
        middleware: function () {
            return [cors];
        },
    });
}

function watchSCSS(src) {
    log('Watching styles ' + c.cyan(src + '/**/*.scss'));

    gulp.watch(src + '/**/*.scss', gulp.series(compileProjectScss)).on('change', function (changedFile) {
        log('File ' + c.yellow(changedFile) + ' was modified');
        sassLinter(changedFile);
    });
}

function watchCSS() {
    log('Watching css ' + c.cyan(config['root'] + configPaths['cssDestination'] + '/*.css'));

    gulp.watch(config['root'] + configPaths['cssDestination'] + '/*.css').on('change', function (changedFile) {
        log('File ' + c.yellow(changedFile) + ' was modified');

        livereload.reload(path.basename(changedFile));
    });
}

function watchHTML() {
    log('Watching HTML');

    gulp.watch([config['root'] + '/*.html']).on('change', function (changedFile) {
        log('File ' + c.yellow(changedFile) + ' was modified');

        livereload.reload(path.basename(changedFile));
    });
}

// Tasks
gulp.task('compile:scss', gulp.series(compileProjectScss));

gulp.task(
    'default',
    gulp.series(
        gulp.parallel(
            connectLiveReload,
            function watchSCSSMain() {
                watchSCSS(config['root'] + configPaths['scssSource']);
            },
            watchCSS,
            watchHTML
        )
    )
);
