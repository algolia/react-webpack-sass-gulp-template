import path from 'path';
import webpack from 'webpack';

const devtool = process.env.NODE_ENV === 'production' ? 'source-map' : 'cheap-module-eval-source-map';
const entry = (process.env.NODE_ENV === 'production' ? [] :
  ['eventsource-polyfill', 'webpack-hot-middleware/client']).concat(['./src/js/main.js']);
const plugins = process.env.NODE_ENV === 'production' ?
  [new webpack.optimize.OccurenceOrderPlugin()] :
  [new webpack.HotModuleReplacementPlugin(), new webpack.NoErrorsPlugin()];

export default {
  devtool,
  entry,
  output: {
    path: path.join(__dirname, 'build', 'js'),
    filename: 'bundle.js'
  },
  plugins,
  module: {
    loaders: [{
      test: /\.jsx?$/,
      loaders: ['babel'],
      include: path.join(__dirname, 'src')
    }]
  }
};
