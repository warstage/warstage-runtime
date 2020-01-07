// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', 'karma-typescript'],
        files: [
            './index.ts',
            './src/**/*.ts',
            './test/**/*.spec.ts'
        ],
        preprocessors: {
            '**/*.ts': 'karma-typescript'
        },
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-coverage-istanbul-reporter'),
            require('karma-typescript')
            // require('@angular-devkit/build-angular/plugins/karma')
        ],
        client: {
            clearContext: false // leave Jasmine Spec Runner output visible in browser
        },
        coverageIstanbulReporter: {
            dir: require('path').join(__dirname, '../coverage/webapp'),
            reports: ['html', 'lcovonly', 'text-summary'],
            fixWebpackSourcePaths: true
        },
        reporters: ['progress', 'karma-typescript', 'kjhtml'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['Chrome'],
        singleRun: false,
        restartOnFileChange: true,
        karmaTypescriptConfig: {
            "compilerOptions": {
                "module": "commonjs",
                "target": "es5",
                "declaration": true,
                "outDir": "dist",
                "typeRoots": [
                    "node_modules/@types"
                ],
                "sourceMap": true,
                "lib": [
                    "es2018",
                    "dom"
                ]
            },
            "exclude": [
                "node_modules",
                "dist"
            ]
        }
    });
};
