'use strict';
const gulp = require('gulp');

const log = require('fancy-log');
const c = require('ansi-colors');

const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const connect = require('gulp-connect');
const styleLint = require('gulp-stylelint');

// Lint scss file with `stylelint`
function sassLinter(file) {
    log('Verifying ' + c.yellow(file));

    return gulp.src(file).pipe(
        styleLint({
            failAfterError: false,
            reporters: [{ formatter: 'verbose', console: true }]
        })
    );
}

// Compile scss
function compileScss(src, dest) {
    log('Compiling ' + c.yellow(src + '/*.scss') + ' into ' + c.green(dest + '/*.css'));

    return gulp
        .src(src + '/*.scss')
        .pipe(sourcemaps.init())
        .pipe(
            sass({
                outputStyle: 'expanded'
            }).on('error', sass.logError)
        )
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(dest));
}

const cors = (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
};

function connectLiveReload() {
    return connect.server({
        root: '.',
        https: false,
        port: 8084,
        host: '127.0.0.1',
        livereload: {
            start: true,
            //port: 9000,
            hostname: '127.0.0.1'
        },
        middleware: function() {
            return [cors];
        }
    });
}

function reloadCSS() {
    log('Reloading CSS...');

    return gulp.src('./css/*.css').pipe(connect.reload());
}

function reloadHTML() {
    log('Reloading HTML...');

    return gulp.src('./*.html').pipe(connect.reload());
}

function watch(src) {
    log('Watching styles ' + c.cyan(src + '/**/*.scss'));

    gulp.watch(src + '/**/*.scss', gulp.series(compileProjectScss, reloadCSS)).on('change', function(changedFile) {
        log('File ' + c.yellow(changedFile) + ' was modified');
        sassLinter(changedFile);
    });

    gulp.watch(['./*.html'], gulp.series(reloadHTML)).on('change', function(changedFile) {
        log('File ' + c.yellow(changedFile) + ' was modified');
    });
}

function compileProjectScss() {
    return compileScss('./scss', './css');
}

gulp.task(
    'default',
    gulp.series(
        gulp.parallel(connectLiveReload, function() {
            watch('./scss');
        })
    )
);
