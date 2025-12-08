import { hashPrecommitment } from '@0xbow/privacy-pools-core-sdk';
import type { Secret } from '@0xbow/privacy-pools-core-sdk';


async function main() {
    const nullifier = BigInt(673) as Secret;
    const secret = BigInt(812) as Secret;

    const hash = hashPrecommitment(nullifier, secret);
    console.log('hash:', hash);
    console.log('0x' + hash.toString(16));

}

main().catch((err) => console.error("Error:", err));

