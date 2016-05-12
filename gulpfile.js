const gulp 				= require( 'gulp' );
const notify 			= require( "gulp-notify" );
const autoprefixer 		= require( 'gulp-autoprefixer' );
const sass 				= require( 'gulp-sass' );
const livereload 		= require( 'gulp-livereload' );
const watch 			= require( 'gulp-watch' );
const jshint 			= require( 'gulp-jshint' );
const sourcemaps 		= require( 'gulp-sourcemaps' );
const gulpif 			= require( 'gulp-if' );
const iconfont 			= require( 'gulp-iconfont' );
const consolidate 		= require( 'gulp-consolidate' );
const uglify 			= require( 'gulp-uglify' );
const newer 			= require( 'gulp-newer' );
const imageop 			= require( 'gulp-image-optimization' );
const lodash  			= require( 'lodash' );
const concat 			= require( 'gulp-concat' );
const spritesmith 		= require('gulp.spritesmith');

require('gulp-stats')(gulp);

const base = './';

const config = {
	
	sass: {
		source: 'assets/sass/',
		destination: 'assets/css/',
		outputStyle: 'nested',
		distribution: 'assets/dist/'
	},
	jshint: {
		source: 'assets/js/',
	},
	html: {
		source: 'logic/'
	},
	iconfont: {
		source: 'assets/fonts/svg/',
		destination: 'assets/fonts/',
		sassIncludePath: '../fonts/',
		sassDestination: 'assets/sass/core/',
		template: 'assets/sass/helpers/',
		fontName: 'icons',
		className: 'icon'
	},
	uglify: {
		manifest: 'assets/js/manifest.json',
		distribution: 'assets/dist/',
		fileName: 'all.min.js'
	},
	imageOptim: {
		source: 'assets/images/',
		destination: 'assets/dist/images/'
	},
	sprites: {
		source: 'assets/images/sprites/',
		destination: 'assets/images/',
		desitnationSCSS: 'assets/sass/helpers/'
	}
};

var ModuleSass = (function( production ){
	
	production = ( typeof production === 'undefined' ) ? false : true;
	
	return gulp.src( base + config.sass.source + '**/*.scss' )
		.pipe(gulpif( !production, sourcemaps.init() ))
		.pipe(
			sass({
				outputStyle: production ? 'compressed' : config.sass.outputStyle,
				errLogToConsole: false
			}).on('error', function( error ) {
				
				notify().write( error );
				this.emit('end');
			})
		)
		.pipe(
			gulpif(
				!production,
				sourcemaps.write()
			)
		)
		.pipe(
			gulpif(
				!production,
				sourcemaps.init()
			)
		)
		.pipe(autoprefixer('last 3 versions'))
		.pipe(
			gulpif(
				!production,
				sourcemaps.write()
			)
		)
		.pipe(gulpif( !production, gulp.dest( base + config.sass.destination ), gulp.dest( base + config.sass.distribution ) ))
		.pipe( livereload() );
});

var ModuleJsHint = (function() {
	
	return gulp.src([
		base + config.jshint.source + '**/*.js',
		'!' + base + config.jshint.source + '**/*.min.*'
	])
	.pipe( jshint() )
	.pipe( jshint.reporter('default') )
	.pipe( notify(function (file) {
		
		if ( file.jshint.success ) {
			
			// Don't show something if success
			return false;
		}

		var errors = file.jshint.results.map(function (data) {
			if (data.error) {
				return "(" + data.error.line + ':' + data.error.character + ') ' + data.error.reason;
			}
		}).join("\n");
		
		return file.relative + " (" + file.jshint.results.length + " errors)\n" + errors;
	}));
});

var ModuleJsUglify = (function(){
	
	var fs = require( 'fs' );
	
	if ( !fs.existsSync(config.uglify.manifest) ) {
		
		console.log('\x1b[31m', 'No manifest.json file found in ' + config.uglify.manifest ,'\x1b[0m');
		return false;
	}
	
	var manifest = JSON.parse( fs.readFileSync(config.uglify.manifest, 'utf8') );
	
	gulp.src( manifest )
		.pipe(concat( config.uglify.fileName ))
		.pipe(uglify({
			mangle: false
		}))
		.pipe(gulp.dest( config.uglify.distribution ));
});

var ModuleImageOptim = (function(){
	
	console.log('Module image optim started');
	
	gulp.src([
		config.imageOptim.source + '**/*.png',
		config.imageOptim.source + '**/*.jpg',
		config.imageOptim.source + '**/*.gif',
		config.imageOptim.source + '**/*.jpeg'
	])
	.pipe(newer( config.imageOptim.destination ))
	.pipe(imageop({
		optimizationLevel: 5,
		progressive: true,
		interlaced: true
	}))
	.pipe(gulp.dest( config.imageOptim.destination ))
	.on('end', function() {})
	.on('error', function( error ) {
		
		notify().write( error );
		this.emit('end');
	});
});

var ModuleIconfont = (function(){
	
	return gulp.src([ config.iconfont.source + '**/*.svg' ])
	.pipe(
		iconfont({
			fontName: config.iconfont.fontName,
			appendUnicode: false,
			normalize: true
		})
	)
	.on('glyphs', function(glyphs, options) {
		
		var unicodeGlyphs 	= [];
		var timestamp 		= new Date().getTime();
		
		for (var i = 0; i < glyphs.length; i++) {
			unicodeGlyphs.push({
				name: glyphs[i].name,
				unicode: glyphs[i].unicode[0].charCodeAt(0).toString(16).toUpperCase()
			});
		}
		
		gulp.src( config.iconfont.template + '_icons.scss' )
			
			.pipe(consolidate('lodash', {
				glyphs: unicodeGlyphs,
				fontName: config.iconfont.fontName,
				fontPath: config.iconfont.sassIncludePath,
				className: config.iconfont.className,
				timestamp: timestamp
			}))
			.pipe(notify({
				title: 'Gulp iconfont',
				message: 'Font created/updated',
				onLast: true
			}))
			.pipe( gulp.dest( config.iconfont.sassDestination ) );
	})
	.pipe(gulp.dest( config.iconfont.destination ));
});

var ModuleSprites = function() {
	
	var spriteData = 
			gulp.src(config.sprites.source + '*.png' )
			.pipe(
				spritesmith({
					imgName: config.sprites.destination + 'sprite.png',
					cssName: config.sprites.desitnationSCSS + '_sprite.scss'
				}
			)
		);
	return spriteData.pipe(gulp.dest( base ));
};

gulp.task( 'default', function() {
	
	ModuleSprites();
	ModuleIconfont();
	ModuleSass();
	ModuleJsHint();
	ModuleImageOptim();
});

gulp.task( 'production', function() {
	
	ModuleSass( true );
	ModuleJsUglify();
	ModuleImageOptim();
});

gulp.task( 'watch', function() {
	
	livereload.listen();
	
	watch([
		base + config.sass.source + '**'
	], function() {
		
		ModuleSass();
	});
	
	watch([
		base + config.html.source + '**/*.html'
	], function() {
		
		livereload.reload();
	});
	
	watch([
		base + config.sprites.source + '**/*'
	], function() {
		
		ModuleSprites();
	})
	
	watch([
		base + config.jshint.source + '**/*.js',
		'!' + base + config.jshint.source + '**/*.min.*'
	], function() {
		
		ModuleJsHint();
	});
	
	watch([
		base + config.iconfont.source + '**/*',
	], function() {
		
		ModuleIconfont();
	});
	
	watch([
		base + config.imageOptim.source + '**/*'
	], function() {
		
		ModuleImageOptim();
	})
});