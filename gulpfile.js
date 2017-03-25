var gulp = require('gulp');
var del = require('del');
var changed = require('gulp-changed');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var plumber = require('gulp-plumber');
var imagemin = require('gulp-imagemin');
var sass = require('gulp-sass');
var cssnano = require('gulp-cssnano');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');
var browsersync = require('browser-sync').create();
var reload = browsersync.reload;
var runSequence = require('run-sequence');
var php = require('gulp-connect-php');
var sftp = require('gulp-sftp');

project = require('./project.json');
pkg = require('./package.json');


// Empties the Build folder
gulp.task('clean', function() {
	return del([project.build_dir + '**/*']);
});

// Imagemin images and ouput them in dist
gulp.task('imagemin', function() {
	return gulp.src(['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'], {
		cwd: project.build_dir + 'assets/images/**'
	}).pipe(imagemin()).pipe(gulp.dest(project.build_dir + 'assets/images/'));
});

gulp.task('copy:images', function() {
	// Copy Images into build
	return gulp.src(['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'], {
		cwd: project.src_dir + 'assets/images/**'
	}).pipe(changed(project.build_dir + 'assets/images/')).pipe(imagemin({
		optimizationLevel: 5
	})).pipe(gulp.dest(project.build_dir + 'assets/images/'));
});

gulp.task('copy:fonts', function() {
	// Copy fonts into build
	return gulp.src(['**/*'], {
		cwd: project.src_dir + 'assets/fonts/**'
	}).pipe(changed(project.build_dir + 'assets/fonts/')).pipe(gulp.dest(project.build_dir + 'assets/fonts/'));
});

gulp.task('copy:php', function() {
	// Copy html  & php
	return gulp.src(['*.ini', '.htaccess', '**/*.html', '**/*.htm', '**/*.php', '!composer.json', '!composer.lock'], {
		cwd: project.src_dir + '**'
	}).pipe(changed(project.build_dir)).pipe(gulp.dest(project.build_dir));
	//.pipe(reload({ stream:true }));
});

gulp.task('scripts', function() {
	// Process scripts and concatenate them into one output file
	return gulp.src(['jquery.js', 'uikit.min.js', 'tooltip.min.js', 'app.js'], {
		cwd: project.src_dir + 'assets/js/'
	}).pipe(changed(project.src_dir + 'assets/js/min/')).pipe(sourcemaps.init()).pipe(jshint()).pipe(jshint.reporter('default')).pipe(uglify()).pipe(concat('app.min.js')).pipe(sourcemaps.write('./')).pipe(gulp.dest(project.src_dir + 'assets/js/min/'));
});

gulp.task('copy:js', function() {
	// Copy lib scripts into build, maintaining the original directory structure
	return gulp.src(['app.min.js.map', 'app.min.js'], {
		cwd: project.src_dir + 'assets/js/min/'
	}).pipe(changed(project.build_dir + 'assets/js')).pipe(gulp.dest(project.build_dir + 'assets/js'))
	.pipe(reload({
		stream: true
	}));
});

gulp.task('styles', function() {

	// Process sass files into one minified app.css

	return gulp.src('app.scss', {
		cwd: project.src_dir + 'assets/scss/'
	})
	.pipe(sourcemaps.init())
	.pipe(sass().on('error', sass.logError))
	.pipe(autoprefixer({
		browsers: ['last 2 versions'],
		cascade: false
	}))
	.pipe(cssnano())
	.pipe(sourcemaps.write('./'))
	.pipe(gulp.dest(project.src_dir + 'assets/css/min/'))
});

gulp.task('copy:css', function() {

	// copy compiled css into build

	return gulp.src(['min/app.css', 'min/app.css.map'], {
		cwd: project.src_dir + 'assets/css/'
	})
	.pipe(gulp.dest(project.build_dir + 'assets/css'))
	.pipe(reload({
		stream: true
	}));
});


//////////////////////////////////////// MAIN WORKFLOW
gulp.task('build', function() {

	// Build a fresh copy

	runSequence('clean', 'copy:fonts', 'scripts', 'styles', 'copy:js', 'copy:css', 'copy:images', 'copy:php', function(error) {
		if (error) {
			console.log(error.message);
		} else {
			console.log('Build Successful.');
		}
	});
});

// Starts a local php
gulp.task('php', function() {
	return php.server({
		base: project.build_dir,
		port: 9185
	});
});

// BrowserSync
gulp.task('browsersync', function() {
	return browsersync.init({
		injectChanges: true,
		proxy: '127.0.0.1:9185',
		open: true,
		notify: true
	});

});

// A development task to run anytime a file changes
gulp.task('watch', ['php'], function() {
	gulp.watch([project.src_dir + 'assets/scss/**/*.scss'], ['styles']);
	gulp.watch([project.src_dir + 'assets/css/min/*'], ['copy:css', reload]);
	gulp.watch(['app.js'], {
		cwd: project.src_dir + '/assets/js/'
	}, ['scripts', reload]);
	gulp.watch([project.src_dir + 'assets/js/min/app.min.js'], ['copy:js', reload]);
	gulp.watch([project.src_dir + 'assets/fonts/**/*'], ['copy:fonts', reload]);
	gulp.watch([project.src_dir + 'assets/images/**/*'], ['copy:images', reload]);
	gulp.watch(['**/*.php', '**/*.html', '**/*.htm', '*.*'], {
		cwd: project.src_dir
	}, ['copy:php', reload]);
});

// Define the default task as a sequence of the above tasks
gulp.task('default', function(callback) {
	return runSequence('build', 'php', 'browsersync', 'watch', callback);
});


//////// RELEASE
gulp.task('release', ['sftp-deploy']);

// Upload
var errorHandler;
gulp.task('sftp-deploy', function() {
	return gulp.src('./build/**/*').pipe(plumber(errorHandler)).pipe(sftp({
		host: project.ftp_host,
		user: project.ftp_user,
		pass: project.ftp_pass,
		remotePath: project.ftp_remote_path
	}));
});
