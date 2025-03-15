/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Configure webpack to handle SVG files
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    return config;
  },
};

export default nextConfig;
