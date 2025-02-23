# Deployment

## Local enviroment

### Copy `.env.example` to `.env.local`

```bash
cp .env.example .env.local
```

### Deploy local

```bash
make local
```

### Run unit test

```bash
make test
```

## Staging enviroment

### Copy `.env.example` to `.env.staging`

````bash
cp .env.example .env.staging
```

### Deploy staging - only deployer can deploy

```bash
make deploy
```
````
