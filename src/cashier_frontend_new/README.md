# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Environment Variables

This project uses Vite for environment variable handling. To set up environment variables:

1. Copy the local development environment file:
   ```sh
   cp .env.local_dev .env.<env>
   ```
   Replace `<env>` with your target environment (e.g., `dev`, `staging`, `production`).

2. Edit the `.env.<env>` file with your specific environment variables.

3. Run the development server with the specific environment:
   ```sh
   npm run dev:dev
   ```

Note: Only `.env.local_dev` is tracked in git. All other `.env.*` files are ignored.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
