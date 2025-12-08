import { calculateContext, bigintToHash } from '@0xbow/privacy-pools-core-sdk';
import { encodeAbiParameters, decodeAbiParameters } from "viem";
import { getAddress, keccak256 } from "viem";

const address = getAddress("0xAFFAF754A72DDC745033007F9A9999B9565D2F74");
console.log("address: ", address);

const encodeData = encodeAbiParameters(
    [
        { name: "recipient", type: "address" },
        { name: "feeRecipient", type: "address" },
        { name: "relayFeeBPS", type: "uint256" },
    ],
    [address, address, 50n],
);

console.log("data: ", encodeData);

// const processorAddr = getAddress("0x83BF6BD52A063F4C0FCE679C36C7E93F377394AB");
const withdrawal = {
    processooor: getAddress("0x83BF6BD52A063F4C0FCE679C36C7E93F377394AB"),
    data: encodeData,
};

const scope = bigintToHash(12685712818171319035286902060502510492903522702918348424231746937977685474225n);
console.log("withdrawal:", withdrawal);
console.log("scope:", scope);

const context = calculateContext(withdrawal, scope);
console.log("context: ", context);

