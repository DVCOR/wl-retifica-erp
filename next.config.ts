import type { NextConfig } from "next";

// Cache Components (PPR) fica desligado de propósito: o app é quase todo
// autenticado e por empresa, e o modelo clássico (rotas dinâmicas ao ler
// cookies) é mais simples para os agentes das próximas rodadas.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
