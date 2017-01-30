module.exports = function(grunt) {
	grunt.initConfig({
		package: grunt.file.readJSON('package.json'),

		clean: {
			dist: 'dist'
		},

		compress: {
			main: {
				options: {
					archive: 'dist/<%= package.name %>-<%= package.version %>.tar.gz'
				},
				expand: true,
				src: [
					'lib/**/*',
					'LICENSE',
					'main.js',
					'package.json'
				],
				dest: '<%= package.name %>'
			}
		},

		jscs: {
			all: {
				options: {
					config: 'jscs.json'
				},
				src: [
					'lib/**/*.js',
					'test/**/*.js',
					'*.js'
				],
				gruntfile: 'Gruntfile.js'
			}
		},

		jshint: {
			all: {
				options: {
					jshintrc: 'jshint.json',
					reporter: require('jshint-stylish')
				},
				src: [
					'lib/**/*.js',
					'test/**/*.js',
					'*.js'
				]
			}
		},

		jsonlint: {
			jscs: {
				src: 'jscs.json'
			},
			jshint: {
				src: 'jshint.json'
			},
			package: {
				src: 'package.json'
			}
		},

		mochaTest: {
			full: {
				src: [
					'test/**/*.js'
				]
			},
			grid: {
				options: {
					reporter: 'dot'
				},
				src: '<%= mochaTest.full.src %>'
			}
		}
	});

	require('load-grunt-tasks')(grunt);

	grunt.registerTask('build', [
		'jsonlint:package',
		'clean:dist',
		'lint',
		'mochaTest:grid',
		'compress'
	]);

	grunt.registerTask('lint', [
		'jsonlint:jshint',
		'jshint',
		'jsonlint:jscs',
		'jscs'
	]);

	grunt.registerTask('test', [
		'mochaTest:full'
	]);

	grunt.registerTask('test:grid', [
		'mochaTest:grid'
	]);

	grunt.registerTask('default', [
		'build'
	]);
};
