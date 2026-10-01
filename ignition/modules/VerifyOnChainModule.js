import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VerifyOnChainModule", (m) => {
    const contract = m.contract("VerifyOnChain");
    return { contract };
});
