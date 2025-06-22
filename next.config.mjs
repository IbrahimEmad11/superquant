/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: false, 
    serverComponentsExternalPackages: [
      '@sap/hana-client',
      'mysql',
      'mysql2',
      'pg-query-stream',
      'react-native-sqlite-storage',
      'sql.js',
      'typeorm-aurora-data-api-driver',
      'oracledb',
      'mssql',
      'better-sqlite3'
    ]
  },
  images: {
    remotePatterns: [],
  },
  webpack: (config, { isServer }) => {
    // Only externalize these packages for server-side bundles
    if (isServer) {
      config.externals.push(
        'mysql',
        'mysql2',
        'pg-query-stream',
        'react-native-sqlite-storage',
        'sql.js',
        'typeorm-aurora-data-api-driver',
        '@sap/hana-client',
        'oracledb',
        'mssql',
        'better-sqlite3'
      );
    }

    return config;
  },
};

export default nextConfig;