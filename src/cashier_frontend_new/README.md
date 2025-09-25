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

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Adding New Components

To add new components to your project, use the shadcn-svelte CLI:

```bash
npx shadcn-svelte@latest add <component-name>
```

### Examples

```bash
# Add a button component
npx shadcn-svelte@latest add button

# Add multiple components at once
npx shadcn-svelte@latest add button input card

# Add a component with specific options
npx shadcn-svelte@latest add dialog --yes
```

### Available Components

Visit [shadcn-svelte components](https://shadcn-svelte.com/docs/components) to see all available components and their documentation.
