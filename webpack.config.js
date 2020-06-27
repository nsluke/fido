const path = require('path');
const sharp = require('sharp');
const stripJsonComments = require('strip-json-comments');
const webpack = require('webpack');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const WriteFilePlugin = require('write-file-webpack-plugin');

function envSelector(options) {
  const envLabel = {
    production: 'prod',
    development: 'dev',
  }[process.env.NODE_ENV];

  if (!envLabel) {
    throw 'Unexpected environment: ' + process.env.NODE_ENV;
  }

  if (!(envLabel in options)) {
    throw 'Missing environment option for label: ' + envLabel;
  }

  return options[envLabel];
}

module.exports = {
  mode: process.env.NODE_ENV,

  entry: {
    popup: path.join(__dirname, 'src/popup.js'),
    injector: path.join(__dirname, 'src/injector.js'),
  },
  output: {
    publicPath: '/',
    path: path.join(__dirname, 'build'),
    filename: '[name].bundle.js',
  },

  resolve: {
    extensions: ['.js', '.vue', '.json', '.css', '.scss'],
    alias: {
      '@': __dirname,
    },
  },

  optimization: {
    minimize: envSelector({
      prod: true,
      dev: false,
    }),
    removeAvailableModules: true,
    removeEmptyChunks: true,
  },

  module: {
    rules: [
      {
        test: /\.vue$/,
        use: 'vue-loader',
      },
      {
        test: /\.js$/,
        include: [path.join(__dirname, 'src')],
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          plugins: ['@babel/plugin-transform-runtime'],
          presets: ['@babel/preset-env'],
        },
      },
      {
        test: /\.(css|sass)$/,
        use: [
          'vue-style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: envSelector({
                  prod: '[hash:base64]',
                  dev: '[path][name]__[local]',
                }),
              },
            },
          },
          'postcss-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: envSelector({
            prod: 'images/[hash:base64].[ext]',
            dev: 'images/[name].[hash:base64].[ext]',
          }),
        },
      },
    ],
  },

  plugins: [
    new CleanWebpackPlugin(),
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/manifest/manifest.json',
          transform(content) {
            return JSON.stringify(
              JSON.parse(stripJsonComments(content.toString()))
            );
          },
        },
        ...[16, 32, 48, 64, 128, 256].map((size) => ({
          from: 'src/manifest/icon.png',
          to: `icons/${size}.png`,
          transform(content) {
            return sharp(content).resize(size, size).toBuffer();
          },
        })),
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: 'src/popup.html' }],
    }),
    new VueLoaderPlugin(),
    new WriteFilePlugin(),
  ],
};
