# create-svedocs

Compatibility package for package-manager create commands:

```sh
pnpm create svedocs my-docs
npm create svedocs@latest my-docs -- --template docs
```

The implementation delegates to `svedocs-cli`, which owns the actual `create-svedocs` and `svedocs` commands.
