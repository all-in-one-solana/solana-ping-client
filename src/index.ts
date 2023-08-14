import web3 = require('@solana/web3.js')
import Dotenv from 'dotenv'
import * as fs from 'fs';
Dotenv.config()

const PROGRAM_ADDRESS = 'ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa'
const PROGRAM_DATA_ADDRESS = 'Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod'

function initializeKeypair(): web3.Keypair {
  if (!process.env.PRIVATE_KEY) {
    console.log('Generating new keypair... 🗝️');
    const signer = web3.Keypair.generate();

    console.log('Creating .env file');
    fs.writeFileSync('.env', `PRIVATE_KEY=[${signer.secretKey.toString()}]`);

    return signer;
  }

  const secret = JSON.parse(process.env.PRIVATE_KEY ?? '') as number[];
  const secretKey = Uint8Array.from(secret);
  const keypairFromSecret = web3.Keypair.fromSecretKey(secretKey);
  return keypairFromSecret;
}

async function airdropSolIfNeeded(
  signer: web3.Keypair,
  connection: web3.Connection
) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log('Current balance is', balance / web3.LAMPORTS_PER_SOL, 'SOL');

  // 1 SOL should be enough for almost anything you wanna do
  if (balance / web3.LAMPORTS_PER_SOL < 1) {
    // You can only get up to 2 SOL per request
    console.log('Airdropping 1 SOL');
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: airdropSignature,
    });

    const newBalance = await connection.getBalance(signer.publicKey);
    console.log('New balance is', newBalance / web3.LAMPORTS_PER_SOL, 'SOL');
  }
}


async function main() {
  console.log("Connecting to devnet...", process.env.DEVNET_URL ?? "")
  const connection = new web3.Connection(process.env.DEVNET_URL ?? "");
  const payer = initializeKeypair();
  console.log("Payer address: ", payer.publicKey.toBase58())
  await airdropSolIfNeeded(payer, connection);

  await pingProgram(connection, payer)
}

main().then(() => {
  console.log("Finished successfully")
}).catch((error) => {
  console.error(error)
})


async function pingProgram(connection: web3.Connection, payer: web3.Keypair) {
  const transaction = new web3.Transaction()

  const programId = new web3.PublicKey(PROGRAM_ADDRESS)
  const programDataPubkey = new web3.PublicKey(PROGRAM_DATA_ADDRESS)

  const instruction = new web3.TransactionInstruction({
    keys: [
      {
        pubkey: programDataPubkey,
        isSigner: false,
        isWritable: true
      },
    ],
    programId
  })

  transaction.add(instruction)

  const signature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  )

  console.log(`You can view your transaction on the Solana Explorer at:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`)
}
