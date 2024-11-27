/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['puppeteer-core'],
  webpack: (config) => {
    // Exclude puppeteer-core from being processed
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false
      },
      exclude: /puppeteer-core/,
    })

    // Add specific handling for puppeteer-core
    config.module.rules.push({
      test: /puppeteer-core/,
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env'],
        plugins: [
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-proposal-private-methods',
          '@babel/plugin-proposal-class-static-block'
        ]
      }
    })

    return config
  }
}

module.exports = nextConfig
