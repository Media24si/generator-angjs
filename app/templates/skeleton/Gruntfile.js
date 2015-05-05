/*jslint node: true */
'use strict';

var pkg = require('./package.json');

//Using exclusion patterns slows down Grunt significantly
//instead of creating a set of patterns like '**/*.js' and '!**/node_modules/**'
//this method is used to create a set of inclusive patterns for all subdirectories
//skipping node_modules, bower_components, dist, and any .dirs
//This enables users to create any directory structure they desire.
var createFolderGlobs = function(fileTypePatterns) {
  fileTypePatterns = Array.isArray(fileTypePatterns) ? fileTypePatterns : [fileTypePatterns];
  var ignore = ['node_modules','bower_components','dist','temp','release'];
  var fs = require('fs');
  return fs.readdirSync(process.cwd())
          .map(function(file){
            if (ignore.indexOf(file) !== -1 ||
                file.indexOf('.') === 0 ||
                !fs.lstatSync(file).isDirectory()) {
              return null;
            } else {
              return fileTypePatterns.map(function(pattern) {
                return file + '/**/' + pattern;
              });
            }
          })
          .filter(function(patterns){
            return patterns;
          })
          .concat(fileTypePatterns);
};

module.exports = function (grunt) {

  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({
    connect: {
      main: {
        options: {
          port: 9001
        }
      }
    },
    watch: {
      main: {
        options: {
            livereload: true,
            livereloadOnError: false,
            spawn: false
        },
        files: [createFolderGlobs(['*.js','*.less','*.html']),'!_SpecRunner.html','!.grunt'],
        tasks: [] //all the tasks are run dynamically during the watch event handler
      }
    },
    jshint: {
      main: {
        options: {
            jshintrc: '.jshintrc'
        },
        src: createFolderGlobs('*.js')
      }
    },
    clean: {
      before:{
        src:['dist','temp','release']
      },
      after: {
        src:['temp']
      }
    },
    less: {
      main: {
        options: {
        },
        files: {
          'temp/app.css': 'less/styles.less'
        }
      },
      dev: {
        options: {
        },
        files: {
          'css/build.css': 'less/styles.less'
        } 
      }
    },
    ngtemplates: {
      main: {
        options: {
            module: pkg.name,
            htmlmin:'<%%= htmlmin.main.options %>'
        },
        src: [createFolderGlobs('*.html'),'!index.html','!_SpecRunner.html'],
        dest: 'temp/templates.js'
      }
    },
    copy: {
      main: {
        files: [
          {nonull: true, src: ['index.html'], dest: 'dist/'},
          {src: ['img/**'], dest: 'dist/'},
          {src: ['bower_components/font-awesome/fonts/**'], dest: 'dist/',filter:'isFile',expand:true},
          {src: ['bower_components/bootstrap/fonts/**'], dest: 'dist/',filter:'isFile',expand:true}
          //{src: ['bower_components/angular-ui-utils/ui-utils-ieshiv.min.js'], dest: 'dist/'},
          //{src: ['bower_components/select2/*.png','bower_components/select2/*.gif'], dest:'dist/css/',flatten:true,expand:true},
          //{src: ['bower_components/angular-mocks/angular-mocks.js'], dest: 'dist/'}
        ]
      }
    },
    rename: {
      main: {
        files: [
          {src: ['dist/'], dest: 'release/'}
        ]
      }
    },
    dom_munger:{
      readscripts: {
        options: {
          read:{selector:'script[data-build!="exclude"]',attribute:'src',writeto:'appjs'}
        },
        src:'index.html'
      },
      removescripts: {
        options:{
          remove:'script[data-remove!="exclude"]'
        },
        src:'dist/index.html'
      }, 
      addscript: {
        options:{
          append:{selector:'body',html:'<script src="app.full.min.js?v=<%= new Date().getTime() %>"></script>'}
        },
        src:'dist/index.html'
      },  
      addsharedscript: {
        options:{
          append:{selector:'body',html:'<script src="app.shared.min.js?v=<%= new Date().getTime() %>"></script>'},
        },
        src:'dist/index.html'
      },       
      removecss: {
        options:{
          remove:'link[data-remove!="exclude"]'
        },
        src:'dist/index.html'
      },
      addcss: {
        options:{
          append:{selector:'head',html:'<link rel="stylesheet" href="css/app.min.css?v=<%= new Date().getTime() %>">'}
        },
        src:'dist/index.html'
      },
      addsharedcss: {
        options:{
          append:{selector:'head',html:'<link rel="stylesheet" href="css/app.shared.min.css">'}
        },
        src:'dist/index.html'
      }
    },
    cssmin: {
      main: {
        src:['temp/app.css'],
        dest:'dist/css/app.min.css'
      }
    },
    /*cssmin: {
      main: {
        src:['temp/app.css','<%%= dom_munger.data.appcss %>'],
        dest:'dist/app.full.min.css'
      }
    },*/
    concat: {
      main: {
        src: ['<%%= dom_munger.data.appjs %>','<%%= ngtemplates.main.dest %>'],
        dest: 'temp/app.full.js'
      }
    },
    ngAnnotate: {
      main: {
        src:'temp/app.full.js',
        dest: 'temp/app.full.js'
      }
    },
    uglify: {
      main: {
        src: 'temp/app.full.js',
        dest:'dist/app.full.min.js'
      }
    },
    htmlmin: {
      main: {
        options: {
          collapseWhitespace: true,
          removeComments: true
          //collapseBooleanAttributes: true,
          //removeAttributeQuotes: true,
          //removeEmptyAttributes: true,
          //removeScriptTypeAttributes: true,
          //removeStyleLinkTypeAttributes: true
        },
        files: {
          'dist/index.html': 'dist/index.html'
        }
      }
    },
    //Imagemin has issues on Windows.  
    //To enable imagemin:
    // - "npm install grunt-contrib-imagemin"
    // - Comment in this section
    // - Add the "imagemin" task after the "htmlmin" task in the build task alias
    // imagemin: {
    //   main:{
    //     files: [{
    //       expand: true, cwd:'dist/',
    //       src:['**/{*.png,*.jpg}'],
    //       dest: 'dist/'
    //     }]
    //   }
    // },
    karma: {
      options: {
        frameworks: ['jasmine'],
        files: [  //this files data is also updated in the watch handler, if updated change there too
          '<%%= dom_munger.data.appjs %>',
          'bower_components/angular-mocks/angular-mocks.js',
          createFolderGlobs('*-spec.js')
        ],
        logLevel:'ERROR',
        reporters:['mocha'],
        autoWatch: false, //watching is handled by grunt-contrib-watch
        singleRun: true
      },
      all_tests: {
        browsers: ['PhantomJS','Chrome','Firefox']
      },
      during_watch: {
        browsers: ['PhantomJS']
      },
    }
  });

  grunt.registerTask('build',['jshint','clean:before','less','dom_munger:readscripts','ngtemplates','cssmin','concat','ngAnnotate','uglify','copy','dom_munger:removecss','dom_munger:addcss','dom_munger:removescripts','dom_munger:addscript','htmlmin','clean:after','rename']);
  grunt.registerTask('serve', ['dom_munger:readscripts','jshint','connect', 'watch']);
  grunt.registerTask('test',['dom_munger:readscripts','karma:all_tests']);
  grunt.registerTask('testjs',['jshint']);

  grunt.event.on('watch', function(action, filepath) {
    //https://github.com/gruntjs/grunt-contrib-watch/issues/156

    var tasksToRun = [];

    if (filepath.lastIndexOf('.js') !== -1 && filepath.lastIndexOf('.js') === filepath.length - 3) {

      //lint the changed js file
      grunt.config('jshint.main.src', filepath);
      tasksToRun.push('jshint');

      //find the appropriate unit test for the changed file
      var spec = filepath;
      if (filepath.lastIndexOf('-spec.js') === -1 || filepath.lastIndexOf('-spec.js') !== filepath.length - 8) {
        spec = filepath.substring(0,filepath.length - 3) + '-spec.js';
      }

      //if the spec exists then lets run it
      if (grunt.file.exists(spec)) {
        var files = [].concat(grunt.config('dom_munger.data.appjs'));
        files.push('bower_components/angular-mocks/angular-mocks.js');
        files.push(spec);
        grunt.config('karma.options.files', files);
        tasksToRun.push('karma:during_watch');
      }
    }

    //if index.html changed, we need to reread the <script> tags so our next run of karma
    //will have the correct environment
    if (filepath === 'index.html') {
      tasksToRun.push('dom_munger:read');
    }

    grunt.config('watch.main.tasks',tasksToRun);

  });
};
