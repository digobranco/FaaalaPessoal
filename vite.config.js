import { defineConfig } from 'vite';
import handlebars from 'vite-plugin-handlebars';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        handlebars({
            partialDirectory: resolve(__dirname, 'partials'),
        }),
    ],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                ferramentas: resolve(__dirname, 'ferramentas.html'),
                sobre: resolve(__dirname, 'sobre.html'),
                contato: resolve(__dirname, 'contato.html'),
                simulador: resolve(__dirname, 'simulador/index.html'),
                'simulador-pontos': resolve(__dirname, 'simulador-pontos/index.html'),
                'simulador-parcelado-ou-avista': resolve(__dirname, 'simulador-parcelado-ou-avista/index.html'),
                'simulador-compra-pontos': resolve(__dirname, 'simulador-compra-pontos/index.html'),
                'calculadora-passagem-pontos': resolve(__dirname, 'calculadora-passagem-pontos/index.html'),
                //'promo-calendar': resolve(__dirname, 'promo-calendar/index.html'),
                //'simulador-investimento': resolve(__dirname, 'simulador-investimento/index.html'),
            },
        },
    },
});
