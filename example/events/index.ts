import dotenv from "dotenv";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PumpFunSDK } from "../../src";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import bs58 from 'bs58';
import {
    getOrCreateKeypair,
    getSPLBalance,
    printSOLBalance,
    printSPLBalance,
} from "../util";
import { TradeEvent } from "pumpdotfun-sdk";

const main = async () => {
    dotenv.config();

    if (!process.env.HELIUS_RPC_URL) {
        console.error("Please set HELIUS_RPC_URL in .env file");
        console.error(
            "Example: HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<your api key>"
        );
        console.error("Get one at: https://www.helius.dev");
        return;
    }

    let connection = new Connection(process.env.HELIUS_RPC_URL || "");

    let wallet = new NodeWallet(new Keypair()); //note this is not used
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "processed",
    });

    let sdk = new PumpFunSDK(provider);

    // let createEvent = sdk.addEventListener("createEvent", (event) => {
    //   console.log("createEvent", event);
    // });
    // console.log("createEvent", createEvent);

    let cnt = 0
    let tradeEvent = sdk.addEventListener("tradeEvent", (event) => {
        if (cnt % 1000 == 0) {
            console.log("tradeEvent");
        }
        cnt += 1;
        trade(event).then(() => {
            // process.exit(0);
        });
    });
    console.log("tradeEvent", tradeEvent);

    // let completeEvent = sdk.addEventListener("completeEvent", (event) => {
    //     console.log("completeEvent", event);
    // });
    // console.log("completeEvent", completeEvent);
};

async function trade(event: TradeEvent) {
    const mintPubkey: PublicKey = event.mint;
    const realSolReserves: bigint = event.realSolReserves;
    const amount = BigInt(85005500000) - realSolReserves
    const limitSol = 1;
    const limitSolLamports = BigInt(limitSol * LAMPORTS_PER_SOL);
    if ((amount <= limitSolLamports && event.realTokenReserves > 0)) {
        console.log("Trade", event);
        const testAccount = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));
        const SLIPPAGE_BASIS_POINTS = BigInt(100);
        const DEFAULT_DECIMALS = 6;

        dotenv.config();

        if (!process.env.HELIUS_RPC_URL) {
            console.error("Please set HELIUS_RPC_URL in .env file");
            console.error(
                "Example: HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<your api key>"
            );
            console.error("Get one at: https://www.helius.dev");
            return;
        }

        let connection = new Connection(process.env.HELIUS_RPC_URL || "");

        let wallet = new NodeWallet(new Keypair()); //note this is not used
        const provider = new AnchorProvider(connection, wallet, {
            commitment: "finalized",
        });

        let sdk = new PumpFunSDK(provider);

        //buy 0.0001 SOL worth of tokens
        let buyResults = await sdk.buy(
            testAccount,
            mintPubkey,
            // BigInt(0.0001 * LAMPORTS_PER_SOL),
            amount,
            SLIPPAGE_BASIS_POINTS,
            {
                unitLimit: 250000,
                unitPrice: 250000,
            },
        );

        if (buyResults.success) {
            printSPLBalance(connection, mintPubkey, testAccount.publicKey);
            console.log("Bonding curve after buy", await sdk.getBondingCurveAccount(mintPubkey));
        } else {
            console.log("Buy failed");
        }

        //sell all tokens
        let currentSPLBalance = await getSPLBalance(
            connection,
            mintPubkey,
            testAccount.publicKey
        );
        console.log("currentSPLBalance", currentSPLBalance);
        // if (currentSPLBalance) {
        //     let sellResults = await sdk.sell(
        //         testAccount,
        //         mintPubkey,
        //         BigInt(currentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)),
        //         SLIPPAGE_BASIS_POINTS,
        //         {
        //             unitLimit: 250000,
        //             unitPrice: 250000,
        //         },
        //     );
        //     if (sellResults.success) {
        //         await printSOLBalance(
        //             connection,
        //             testAccount.publicKey,
        //             "Test Account keypair"
        //         );

        //         printSPLBalance(connection, mintPubkey, testAccount.publicKey, "After SPL sell all");
        //         console.log("Bonding curve after sell", await sdk.getBondingCurveAccount(mintPubkey));
        //     } else {
        //         console.log("Sell failed");
        //     }
        // };
    }
}

main();

