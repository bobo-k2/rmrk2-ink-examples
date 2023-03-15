export interface Metadata {
  name: string;
  description: string;
  externalUri?: string;
  mediaUri?: string;
  image: string;
  properties: {
    [key: string]: Property;
  }
}

export interface Property {
  type: string;
  value: string;
}

export interface CollectionConfiguration {
  contractAddress?: string;
  authorUrl: string;
  name: string;
  description: string;
  symbol: string;
  baseUri: string;
  collectionMetadataUri: string;
  collectionImagesUri: string;
  maxSupply: number;
  pricePerMint: string;
  royaltyReceiverAddress: string;
  royalty: number; // Percentage (e.g. 10 = 10%)
  numberOfEquippableSlots: number;
}