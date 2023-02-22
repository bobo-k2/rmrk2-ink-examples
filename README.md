**NOTE: Still under development**
**Doesn't work with Node v18. Use v16 instead.**

This repository showcases a collection of examples on how to use RMRK2 with Ink! [contract](https://github.com/rmrk-team/rmrk-ink) implementation.

The inspiration came from a very similar [project](https://github.com/rmrk-team/rmrk2-examples) targeting RMRK2 pallet.

This is a monorepo, so do `yarn install` from the root of this repo.

### Scripts

Under `/projects/scripts` you can find scripts for deploying contracts, building NFT parts catalog and building a single Chunky NFT.

Before running scripts install and run the latest [Swanky Node](https://github.com/AstarNetwork/swanky-node) by running the command

`./target/release/swanky-node --dev --tmp -lruntime=trace -lruntime::contracts=debug -lerror`

After Swanky Node is up and running navigate to the folder above and execute the command

`yarn run-all`
 
 which will perform all needed to mint single NFT and his parts. The scripts deploys two contracts, one with chunky NFT and another with Chunky parts and catalog.

 In the script output look for contract addresses they will be needed later.

```
Deploying contracts
Deploying Chunky contract...
Chunky contract deployed at address 5F4Aoy2nfGeRLZXF7mm4gk7ZhymXy4EaMRBKzjkNthpUJ8nk
Deploying Chunky Parts contract...
Chunky Parts contract deployed at address 5FtKQKUiFD9oy8mLqeEnKVQmhThwNachxmZquCQRJHZA8tgQ
Building parts catalog
Adding base parts
```

### UI
Under `/projects/ui2` you can find simple Vue app to display, equip, unequip the NFT previously built

![Chunky](chunky.png)

Update contract addresses in `useNft.ts` with the ones got from the script output.

Navigate to the folder above and execute
`yarn serve`

Open local page (most likely `http://localhost:8080/`) in web browser to display the NFT.
