const { ethers } = require("ethers");
const PolygonZkEVMDeployer = artifacts.require("PolygonZkEVMDeployer.sol");
const FflonkVerifier = artifacts.require("FflonkVerifier.sol");
const PolygonZkEVMBridgeV2 = artifacts.require("PolygonZkEVMBridgeV2.sol");
const PolygonZkEVMGlobalExitRootV2 = artifacts.require("PolygonZkEVMGlobalExitRootV2.sol");
const PolygonZkEVMExistentEtrog = artifacts.require("PolygonZkEVMExistentEtrog.sol");
const PolygonZkEVMEtrog = artifacts.require("PolygonZkEVMEtrog.sol");
const PolygonRollupManager = artifacts.require("PolygonRollupManager.sol")
const PolygonZkEVMTimelock = artifacts.require("PolygonZkEVMTimelock.sol");

const ProxyAdmin = artifacts.require("./compiled-contracts/ProxyAdmin.json");
const TransparentUpgradeableProxy = artifacts.require("./compiled-contracts/TransparentUpgradeableProxy.json");
const { create2Deployment,sleep } = require('../helpers/deployment-helpers');
const deployParameters = require('../helpers/deploy_parameters.json');
const genesis = require('../helpers/genesis-202405.json');




module.exports = async (deployer,network,accounts) => {
  // deployer.deploy(MyContract);
  deployer.then(async() => {
    console.log('accounts',accounts)
    let admin = accounts;
    // 部署时用他们指定的admin： TTVYBHGxxn7Yi9v7SyrYkYDVcukUmB5KtV
    // let admin = "TTVYBHGxxn7Yi9v7SyrYkYDVcukUmB5KtV";
    const genesisRootHex = genesis.root;
    const networkIDMainnet = 0;
    const {
      realVerifier,
      trustedSequencerURL,
      networkName,
      version,
      trustedSequencer,
      chainID,
      trustedAggregator,
      trustedAggregatorTimeout,
      pendingStateTimeout,
      forkID,
      zkEVMOwner,
      timelockAddress,
      emergencyCouncil,
      minDelayTimelock,
      salt,
      zkEVMDeployerAddress,
      gasTokenAddress,
      gasTokenNetwork,
      gasTokenMetaData,
      rollupCompatibilityID,
      description,
      chainID1
  } = deployParameters;

    const zkEVMDeployerContract = await deployer.deploy(
      PolygonZkEVMDeployer,admin
    );
    console.log('zkEVMDeployerContract deployed to:', zkEVMDeployerContract.address);

    const verifierContract = await deployer.deploy(FflonkVerifier);
    console.log('VerifierContract deployed to:', verifierContract.address);
    await sleep(3000);

    // Deploy proxy admin:
    // const proxyAdminAddress = await deployer.deploy(ProxyAdmin);
    // 走create2方式部署
    // const proxyAdminFactory = await ethers.getContractFactory('ProxyAdmin', admin);
    // const deployTransactionAdmin = (proxyAdminFactory.getDeployTransaction()).data;
    const deployTransactionAdmin = ProxyAdmin.bytecode;
    const iface = new ethers.utils.Interface(["function transferOwnership(address newOwner)","function initialize(uint32,address,address)"])
    const dataCallAdmin = iface.encodeFunctionData('transferOwnership', [tronWrap.address.toHex(admin).replace(/^41/, '0x')]);
    const [proxyAdminAddress, isProxyAdminDeployed] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionAdmin,
        dataCallAdmin,
        deployer,
    );
    // console.log('1111',tronWrap.address.toHex(admin).replace(/^41/, '0x'));

    if (isProxyAdminDeployed) {
        console.log('#######################\n');
        console.log('ProxyAdmin deployed to:\n (hex)', proxyAdminAddress, '\n (base58)', tronWrap.address.fromHex(proxyAdminAddress));
    }
    await sleep(3000);


    //Deploy implementation PolygonZkEVMBridgeV2
    const deployTransactionBridgeV2 = PolygonZkEVMBridgeV2.bytecode;
    const dataCallNull = null;

    const [bridgeV2ImplementationAddress, isBridgeV2ImplDeployed] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionBridgeV2,
        dataCallNull,
        deployer,
    );

    if (isBridgeV2ImplDeployed) {
        console.log('#######################\n');
        console.log('PolygonZkEVMBridgeV2: bridgeImplementaion deployed to:\n (hex)', bridgeV2ImplementationAddress, '\n (base58)', tronWrap.address.fromHex(bridgeV2ImplementationAddress));
    }
    await sleep(3000);
    //  ********************************************* deploy proxy PolygonZkEVMBridge
    // const transparentProxyFactory = await ethers.getContractFactory('TransparentUpgradeableProxy', deployer);
    const transparentProxyFactory = TransparentUpgradeableProxy.bytecode;
    const initializeEmptyDataProxy = '0x';
    let deployTransactionProxy = ethers.utils.defaultAbiCoder.encode(
      ["address","address","bytes"],
      [bridgeV2ImplementationAddress.replace(/^41/,'0x'),proxyAdminAddress.replace(/^41/,'0x'),initializeEmptyDataProxy]).replace(/^0x/,'');

    deployTransactionProxy = transparentProxyFactory.toString().concat(deployTransactionProxy);

    // TODO:先部署，稍后再initialize
    // const dataCallProxy = iface.encodeFunctionData('initialize', [networkIDMainnet,precalculateGLobalExitRootAddress,precalculateZkevmAddress]);
    // const dataCallProxy = polygonZkEVMBridgeFactory.interface.encodeFunctionData(
    //   'initialize',
    //   [
    //       networkIDMainnet, // _networkID
    //       precalculateGLobalExitRootAddress, //global exit root manager address
    //       precalculateZkevmAddress, //polygonZkEVM address
    //   ],
    // );
    const [proxyBridgeV2Address, isBridgeV2ProxyDeployed] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionProxy,
        dataCallNull,//TODO:后续单独 dataCallProxy
        deployer,
    );
    const polygonZkEVMBridgeContractV2 = proxyBridgeV2Address;

    if (isBridgeV2ProxyDeployed) {
      console.log('#######################\n');
      console.log('PolygonZkEVMBridgeV2: PolygonZkEVMBridgeV2 contract deployed to:\n (hex)', polygonZkEVMBridgeContractV2, '\n (base58)', tronWrap.address.fromHex(polygonZkEVMBridgeContractV2));
    }
  await sleep(5000);
// ***************************************************************** 部署PolygonZkEVMGlobalExitRoot，因为构造函数参数的关系，先部署代理合约

// 部署PolygonZkEVMGlobalExitRoot Proxy Admin
let salt1 = "0x0000000000000000000000000000000000000000000000000000000000000001"
//       const [exitRootProxyAdmin, isExitRootProxyAdminDeployed] = await create2Deployment(
//           zkEVMDeployerContract,
//           salt2,
//           deployTransactionAdmin,
//           dataCallAdmin,
//           deployer,
//       );
//       if (isExitRootProxyAdminDeployed) {
//           console.log('#######################\n');
//           console.log('PolygonZkEVMGlobalExitRoot: exitRootProxyAdmin deployed to:\n (hex)', exitRootProxyAdmin, '\n (base58)', tronWrap.address.fromHex(exitRootProxyAdmin));
//       }
//       await sleep(3000);

    // 部署 PolygonZkEVMGlobalExitRoot TransparentUpgradeableProxy
    let deployExitRootTransactionProxy = ethers.utils.defaultAbiCoder.encode(
      ["address","address","bytes"],
      [bridgeV2ImplementationAddress.replace(/^41/,'0x'),proxyAdminAddress.replace(/^41/,'0x'),initializeEmptyDataProxy]).replace(/^0x/,'');
    deployExitRootTransactionProxy = transparentProxyFactory.toString().concat(deployExitRootTransactionProxy);

    const [polygonZkEVMGlobalExitRootV2, isExitRootProxyDeployedV2] = await create2Deployment(
        zkEVMDeployerContract,
        salt1,
        deployExitRootTransactionProxy,
        dataCallNull,
        deployer,
    );
    if(isExitRootProxyDeployedV2){
      console.log('#######################\n');
      console.log('PolygonZkEVMGlobalExitRoot: PolygonZkEVMGlobalExitRoot contract deployed to:\n (hex)', polygonZkEVMGlobalExitRootV2, '\n (base58)', tronWrap.address.fromHex(polygonZkEVMGlobalExitRootV2));
    }

    await sleep(5000);

    // 部署PolygonRollupManager Proxy
    let salt2 = "0x0000000000000000000000000000000000000000000000000000000000000002"
    // 部署PolygonRollupManager implementaion
    const PolygonRollupManagerImpl = await deployer.deploy(PolygonRollupManager,polygonZkEVMGlobalExitRootV2,proxyBridgeV2Address);
    console.log('PolygonRollupManage : PolygonRollupManageImplementaion deployed to:', PolygonRollupManagerImpl.address);
    // 部署 PolygonRollupManager Proxy: TransparentUpgradeableProxy
    let deployPolygonRollupManagerTransactionProxy = ethers.utils.defaultAbiCoder.encode(
        ["address","address","bytes"],
        [PolygonRollupManagerImpl.address.replace(/^41/,'0x'),proxyAdminAddress.replace(/^41/,'0x'),initializeEmptyDataProxy]).replace(/^0x/,'');
    deployPolygonRollupManagerTransactionProxy = transparentProxyFactory.toString().concat(deployPolygonRollupManagerTransactionProxy);


    const [polygonRollupManagerContract, isPolygonRollupManagerTransactionProxy] = await create2Deployment(
        zkEVMDeployerContract,
        salt2,
        deployPolygonRollupManagerTransactionProxy,
        dataCallNull,
        deployer,
    );
    if(isPolygonRollupManagerTransactionProxy){
      console.log('#######################\n');
      console.log('polygonRollupManagerContract : polygonRollupManagerContract proxy Contract deployed to:\n (hex)', polygonRollupManagerContract, '\n (base58)', tronWrap.address.fromHex(polygonRollupManagerContract));
    }



    // 部署PolygonZkEVMExistentEtrog
    let salt3 = "0x0000000000000000000000000000000000000000000000000000000000000003"

    // step2: 部署 PolygonZkEVMExistentEtrog implementaion
    const polygonZkEVMExistentEtrogImpl = await deployer.deploy(PolygonZkEVMExistentEtrog,polygonZkEVMGlobalExitRootV2, polygonZkEVMBridgeContractV2, polygonRollupManagerContract);
    console.log('polygonZkEVMExistentEtrogImpl : polygonZkEVMExistentEtrogImpl deployed to:', polygonZkEVMExistentEtrogImpl.address);

    // step3: 部署 PolygonZkEVMExistentEtrog TransparentUpgradeableProxy
    let PolygonZkEVMExistentEtrogTransactionProxy = ethers.utils.defaultAbiCoder.encode(
      ["address","address","bytes"],
      [polygonZkEVMExistentEtrogImpl.address.replace(/^41/,'0x'),proxyAdminAddress.replace(/^41/,'0x'),initializeEmptyDataProxy]).replace(/^0x/,'');
      PolygonZkEVMExistentEtrogTransactionProxy = transparentProxyFactory.toString().concat(PolygonZkEVMExistentEtrogTransactionProxy);

    const [polygonZkEVMExistentEtrogContract, isPolygonZkEVMExistentEtrogTransactionProxy] = await create2Deployment(
        zkEVMDeployerContract,
        salt3,
        PolygonZkEVMExistentEtrogTransactionProxy,
        dataCallNull,
        deployer,
    );
    if(isPolygonZkEVMExistentEtrogTransactionProxy){
      console.log('#######################\n');
      console.log('polygonZkEVMExistentEtrogContract : polygonZkEVMExistentEtrogContract Contract deployed to:\n (hex)',
          polygonZkEVMExistentEtrogContract, '\n (base58)', tronWrap.address.fromHex(polygonZkEVMExistentEtrogContract));
    }


    // 调用 proxyBridgeAddress 合约的 initialize
    const proxyBridgeAddressContractABI = await PolygonZkEVMBridgeV2.at(proxyBridgeV2Address);
    const txid1 =  await proxyBridgeAddressContractABI.initialize(
        networkIDMainnet,
        gasTokenAddress,
        gasTokenNetwork,
        polygonZkEVMGlobalExitRootV2,
        polygonRollupManagerContract,
        gasTokenMetaData);
    console.log('txid1',txid1);


    // //  部署PolygonZkEVMGlobalExitRootV2 implementation
    const globalExitRootV2Implementation = await deployer.deploy(PolygonZkEVMGlobalExitRootV2,polygonRollupManagerContract,proxyBridgeV2Address);
    console.log('PolygonZkEVMGlobalExitRootV2: globalExitRootV2Implementation deployed to:', globalExitRootV2Implementation.address);
    // //  更新 PolygonZkEVMGlobalExitRoot 的 implementation，调用 ProxyAdmin 的 upgrade(TransparentUpgradeableProxy proxy, address implementation)
    const proxyAdminABI = await ProxyAdmin.at(proxyAdminAddress);
    const txid2 = await proxyAdminABI.upgrade(polygonZkEVMGlobalExitRootV2,globalExitRootV2Implementation.address);
    console.log('txid2',txid2);

    // 调用 polygonRollupManagerContract 合约的 initialize

      const admin2 = tronWrap.address.toHex(admin).replace(/^41/, '0x');
      const proxypolygonRollupManagerContractABI = await PolygonRollupManager.at(polygonRollupManagerContract);
      const txid3 =  await proxypolygonRollupManagerContractABI.initialize(
          trustedAggregator,
          pendingStateTimeout,
          trustedAggregatorTimeout,
          admin2,
          timelockAddress,
          emergencyCouncil,
          polygonZkEVMExistentEtrogContract,
          verifierContract.address,
          forkID,
          chainID);
      console.log('txid3',txid3);

    // deploy timelock
    const timelockContract = await deployer.deploy(PolygonZkEVMTimelock,minDelayTimelock,[admin2],[admin2],admin2,polygonZkEVMExistentEtrogContract);
    console.log('#######################\n');
    console.log('Polygon timelockContract deployed to:',timelockContract.address);

    // change the owner of proxy admin
    const txid4 = await proxyAdminABI.transferOwnership(timelockContract.address);
    console.log('transfer the owner of proxyAdmin to timelockContract:');
    console.log('txid4', txid4);

    console.log('\n#######################');
    console.log('#####    Checks  PolygonZkEVM  #####');
    console.log('#######################');

    console.log("ProxyPolygonRollupManagerContract")
    console.log("globalExitRootManager", await proxypolygonRollupManagerContractABI.globalExitRootManager())
    console.log("bridgeAddress", await proxypolygonRollupManagerContractABI.bridgeAddress())
    console.log('pendingStateTimeout:', await proxypolygonRollupManagerContractABI.pendingStateTimeout());
    console.log('trustedAggregatorTimeout:', await proxypolygonRollupManagerContractABI.trustedAggregatorTimeout());


    console.log("PolygonZkEVMExistentEtrogContract")
    const polygonZkEVMContractABI = await PolygonZkEVMExistentEtrog.at(polygonZkEVMExistentEtrogContract);
    console.log('globalExitRootManager:', await polygonZkEVMContractABI.globalExitRootManager());
    console.log('bridgeAddress:', await polygonZkEVMContractABI.bridgeAddress());
    console.log('rollupManager:', await polygonZkEVMContractABI.rollupManager());
    // console.log('admin:', await polygonZkEVMContractABI.admin());
    // console.log('trustedSequencer:', await polygonZkEVMContractABI.trustedSequencer());
    // console.log('trustedSequencerURL:', await polygonZkEVMContractABI.trustedSequencerURL());
    // console.log('networkName:', await polygonZkEVMContractABI.networkName());


    //部署 PolygonZkEVMEtrog implementaion
    const polygonZkEVMEtrogImpl = await deployer.deploy(PolygonZkEVMEtrog,polygonZkEVMGlobalExitRootV2, polygonZkEVMBridgeContractV2, polygonRollupManagerContract);
      console.log('polygonZkEVMEtrogImpl : polygonZkEVMEtrogImpl deployed to:', polygonZkEVMEtrogImpl.address);



    // const tx5 = await proxypolygonRollupManagerContractABI.addNewRollupType(
    //     polygonZkEVMEtrogImpl.address,
    //     verifierContract.address,
    //     forkID,
    //     rollupCompatibilityID,
    //     genesisRootHex,
    //     description
    // );
    // console.log('txid5', tx5);
    //
    // const tx6 = await proxypolygonRollupManagerContractABI.createNewRollup(
    //       1,
    //       chainID1,
    //       admin2,
    //       trustedSequencer,
    //       gasTokenAddress,
    //       trustedSequencerURL,
    //       networkName,
    //   );
    // console.log('txid6', tx6);

   //最后根据 CreateNewRollup事件或内部交易获取PolygonZkEVMEtrog代理合约地址

   console.log("Print address: ")
   console.log("FflonkVerifier: ", tronWrap.address.fromHex(verifierContract.address))
   console.log("ProxyAdmin: ", tronWrap.address.fromHex(proxyAdminAddress))
   console.log("PolygonZkEVMBridgeV2 impl: ", tronWrap.address.fromHex(bridgeV2ImplementationAddress))
   console.log("PolygonZkEVMBridgeV2 proxy: ", tronWrap.address.fromHex(polygonZkEVMBridgeContractV2))
   console.log("PolygonZkEVMBridgeV2 proxy hex: ", polygonZkEVMBridgeContractV2)
   console.log("PolygonZkEVMGlobalExitRootV2 impl: ", tronWrap.address.fromHex(globalExitRootV2Implementation.address))
   console.log("PolygonZkEVMGlobalExitRootV2 proxy: ", tronWrap.address.fromHex(polygonZkEVMGlobalExitRootV2))
   console.log("PolygonZkEVMGlobalExitRootV2 proxy hex: ", polygonZkEVMGlobalExitRootV2)
   console.log("PolygonRollupManager impl: ", tronWrap.address.fromHex(PolygonRollupManagerImpl.address))
   console.log("PolygonRollupManager proxy: ", tronWrap.address.fromHex(polygonRollupManagerContract))
   console.log("PolygonRollupManager proxy hex: ", polygonRollupManagerContract)
   console.log("PolygonZkEVMExistentEtrog impl: ", tronWrap.address.fromHex(polygonZkEVMExistentEtrogImpl.address))
   console.log("PolygonZkEVMExistentEtrog proxy: ", tronWrap.address.fromHex(polygonZkEVMExistentEtrogContract))
   console.log("PolygonZkEVMExistentEtrog proxy hex: ", polygonZkEVMExistentEtrogContract)
   console.log("PolygonZkEVMTimelock: ", tronWrap.address.fromHex(timelockContract.address))
   console.log("PolygonZkEVMEtrog impl: ", tronWrap.address.fromHex(polygonZkEVMEtrogImpl.address))
  })
};
