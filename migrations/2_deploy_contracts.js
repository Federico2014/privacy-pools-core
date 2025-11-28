
const EntryPoint = artifacts.require("EntryPoint.sol");
const WithdrawVerifier = artifacts.require("WithdrawalVerifier.sol");
const CommitmentVerifier = artifacts.require("CommitmentVerifier.sol");
const PrivacyPoolSimple = artifacts.require("PrivacyPoolSimple.sol");
const PrivacyPoolComplex = artifacts.require("PrivacyPoolComplex.sol");
const PoseidonT3 = artifacts.require("PoseidonT3.sol");
const PoseidonT4 = artifacts.require("PoseidonT4.sol");

const assetETH = "TXka46PPwttNPWfFDPtt3GUodbPThyufaV";
const assetUSDT = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"; // USDT on Nile network
const minimumDeposit = 1;
vettingFeeBPS = 100;
maxRelayBFS = 100;

module.exports = async (deployer, network, accounts) => {
  // deployer.deploy(MyContract);
  deployer.then(async () => {
    console.log('accounts', accounts)
    let owner = accounts;
    let postman = accounts;

    const entryPoint = await deployer.deploy(EntryPoint, owner, postman);
    console.log('EntryPoint deployed to:', entryPoint.address);

    const withdrawVerifer = await deployer.deploy(WithdrawVerifier);
    console.log('WithdrawVerifer deployed to:', withdrawVerifer.address);

    const commitmentVerifer = await deployer.deploy(CommitmentVerifier);
    console.log('CommitmentVerifer deployed to:', commitmentVerifer.address);

    const poseidonT3 = await deployer.deploy(PoseidonT3);
    console.log('PoseidonT3 deployed to:', poseidonT3.address);

    const poseidonT4 = await deployer.deploy(PoseidonT4);
    console.log('PoseidonT4 deployed to:', poseidonT4.address);

    await deployer.link(PoseidonT3, PrivacyPoolSimple);
    await deployer.link(PoseidonT4, PrivacyPoolSimple);

    const privacyPoolSimple = await deployer.deploy(PrivacyPoolSimple,
      entryPoint.address,
      withdrawVerifer.address,
      commitmentVerifer.address);
    console.log('PrivacyPoolSimple deployed to:', privacyPoolSimple.address);

    await deployer.link(PoseidonT3, PrivacyPoolComplex);
    await deployer.link(PoseidonT4, PrivacyPoolComplex);

    const privacyPoolComplex = await deployer.deploy(PrivacyPoolComplex,
      entryPoint.address,
      withdrawVerifer.address,
      commitmentVerifer.address,
      assetUSDT);
    console.log('PrivacyPoolComplex deployed to:', privacyPoolComplex.address);

    const entryPointABI = await EntryPoint.at(entryPoint.address);
    const registerPoolSimpleTx = await entryPointABI.registerPool(
      assetETH,
      privacyPoolSimple.address,
      minimumDeposit,
      vettingFeeBPS,
      maxRelayBFS
    );

    console.log('registerPoolSimpleTx', registerPoolSimpleTx);

    const regisPoolComplexTx = await entryPointABI.registerPool(
      assetUSDT,
      privacyPoolComplex.address,
      minimumDeposit,
      vettingFeeBPS,
      maxRelayBFS
    );
    console.log('regisPoolComplexTx', regisPoolComplexTx);
  })
};
