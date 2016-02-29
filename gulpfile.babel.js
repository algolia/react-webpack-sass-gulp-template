// core
import gulp from 'gulp';
import gutil from 'gulp-util';
import del from 'del';
import runSequence from 'run-sequence';
import dotenv from 'dotenv';
import open from 'open';

// dev
import express from 'express';
import livereload from 'gulp-livereload';

// deploy
import ghPages from 'gulp-gh-pages';

// css
import sass from 'gulp-sass';
import sassLint from 'gulp-sass-lint';
import autoprefixer from 'gulp-autoprefixer';
import sourcemaps from 'gulp-sourcemaps';

// html
import haml from 'gulp-haml';

// js
import webpack from 'webpack';
import webpackStream from 'webpack-stream';
import webpackConfig from './webpack.config.js';
import eslint from 'gulp-eslint';

// prod
import rev from 'gulp-rev-mtime';
import minifyCss from 'gulp-minify-css';
import uglify from 'gulp-uglify';

// -------------------------------------
//   Init
// -------------------------------------

// eventually load env variables
dotenv.config({silent: true});

// -------------------------------------
//   Task: Clean build directory
// -------------------------------------
gulp.task('clean', () => del('build'));

// -------------------------------------
//   Task: Haml
// -------------------------------------
gulp.task('haml', () =>
  gulp.src('src/*.haml')
    .pipe(haml())
    .on('error', function handleError(error) {
      const message = new gutil.PluginError('haml', error).toString();
      process.stderr.write(`${message}\n`);
      this.emit('end');
    })
    .pipe(gulp.dest('build'))
);

// -------------------------------------
//   Task: SCSS
// -------------------------------------
gulp.task('scss', () =>
  gulp.src('src/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('build/css'))
    .pipe(livereload())
);

// -------------------------------------
//   Task: Lint SCSS
// -------------------------------------
gulp.task('lint:scss', () =>
  gulp.src('src/scss/*.scss')
    .pipe(sassLint())
    .pipe(sassLint.format())
);

// -------------------------------------
//   Task: Minify CSS
// -------------------------------------
gulp.task('css:min', ['scss'], () =>
  gulp.src('build/css/*.css')
    .pipe(minifyCss())
    .pipe(gulp.dest('build/css'))
);

// -------------------------------------
//   Task: Javascript
// -------------------------------------
gulp.task('js', () =>
  gulp.src('src/js/main.js')
    .pipe(webpackStream(webpackConfig))
    .pipe(gulp.dest('build/js'))
    .pipe(livereload())
);

// -------------------------------------
//   Task: Lint Javascript
// -------------------------------------
gulp.task('lint:js', () =>
  gulp.src('src/js/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
);

// -------------------------------------
//   Task: Minify JS
// -------------------------------------
gulp.task('js:min', ['js'], () =>
  gulp.src('build/js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('build/js'))
);

// -------------------------------------
//   Task: Images
// -------------------------------------
gulp.task('images', () =>
  gulp.src('src/img/**/*')
    .pipe(gulp.dest('build/img'))
    .pipe(livereload())
);

// -------------------------------------
//   Task: Watch
// -------------------------------------
gulp.task('watch', () => {
  gulp.watch('src/*.haml', ['build:haml']);
  gulp.watch('src/scss/**/*.scss', ['scss', 'lint:scss']);
  gulp.watch('src/js/**/*.js', ['js', 'lint:js']);
  gulp.watch('src/img/**/*', ['images']);
});

// -------------------------------------
//   Task: Web Server
// -------------------------------------
gulp.task('serve', (cb) => {
  livereload.listen({port: (process.env.LIVERELOAD_PORT || 35729)});

  const app = express();
  const compiler = webpack(webpackConfig);
  app.use(require('webpack-dev-middleware')(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath
  }));
  app.use(require('webpack-hot-middleware')(compiler));
  app.use(require('connect-livereload')({
    port: (process.env.LIVERELOAD_PORT || 35729)
  }));
  app.use(express.static('build'));
  app.listen(process.env.HTTP_PORT || 1337, '0.0.0.0', (err) => {
    if (err) {
      console.log(err);
      return;
    }
    const url = `http://0.0.0.0:${process.env.HTTP_PORT || 1337}`;
    console.log(`Listening at ${url}`);
    open(url);
    cb();
  });
});

// -------------------------------------
//   Task: Revision
// -------------------------------------
gulp.task('rev', () =>
  gulp.src('build/*.html')
		.pipe(rev({cwd: 'build', fileTypes: ['css', 'js']}))
		.pipe(gulp.dest('build'))
);

// -------------------------------------
//   Task: Build DEV - PROD - HAML
// -------------------------------------
gulp.task('build:dev', ['clean'], (callback) => {
  runSequence('scss', 'images', 'haml', callback);
});

gulp.task('build:prod', ['clean'], (callback) => {
  runSequence('scss', 'css:min', 'haml', 'js:min', 'images', 'rev', callback);
});

gulp.task('build:haml', (callback) => {
  runSequence('haml', callback);
});

// -------------------------------------
//   Task: Development
// -------------------------------------
gulp.task('dev', (callback) => {
  runSequence('build:dev', 'watch', 'serve', callback);
});

gulp.task('lint', (callback) => {
  runSequence('lint:scss', 'lint:js', callback);
});

// -------------------------------------
//   Task: Deploy Github Pages
// -------------------------------------
gulp.task('deploy', ['build:prod'], () =>
  gulp.src('build/**/*')
    .pipe(ghPages())
);
