# shadcn-svelte Components

This directory contains shadcn-svelte UI components for your SvelteKit project. shadcn-svelte is a collection of reusable components built on top of Tailwind CSS and Radix UI primitives.

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

## Folder Structure

```
src/lib/shadcn/
├── components/
│   ├── ui/           # Core UI components (buttons, inputs, dialogs, etc.)
│   ├── utils/        # Utility functions and helpers
│   └── hooks/        # Custom Svelte hooks and reactive utilities
├── index.ts          # Main export file for the shadcn library
└── README.md         # This documentation file
```

### Folder Explanations

- **`components/ui/`**: Contains the main UI components like Button, Input, Dialog, Card, etc. These are the building blocks of your interface.

- **`components/utils/`**: Utility functions that support the UI components, such as class name merging utilities (`cn`), type helpers, and other shared logic.

- **`components/hooks/`**: Custom Svelte hooks that provide reactive behavior, like dialog state management, form handling, or other interactive features.

- **`index.ts`**: The main entry point that exports all components, utilities, and hooks for easy importing throughout your application.

## Configuration

The components are configured through `components.json` in the project root, which defines:

- Tailwind CSS settings
- Path aliases for easy imports
- Component registry URL
- TypeScript support

## Usage

After adding components, import them in your Svelte files:

```svelte
<script lang="ts">
  import { Button } from '$lib/shadcn/components/ui/button';
  import { Input } from '$lib/shadcn/components/ui/input';
</script>

<Button variant="default">Click me</Button>
<Input placeholder="Enter text" />
```

## Customization

Components can be customized by:

1. Modifying the component files directly
2. Overriding Tailwind CSS classes
3. Extending component props
4. Creating custom variants

For more advanced customization, refer to the [shadcn-svelte documentation](https://shadcn-svelte.com/docs).</content>
<parameter name="filePath">/Users/longtran/Documents/cashier/src/cashier_frontend_new/src/lib/shadcn/README.md
