import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// ============================================================
// Helper: Update an environment variable in a .env file
// ============================================================

function updateEnvVariable(envPath, key, value) {
    let envContent = "";

    // Create/read .env
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
    }

    // Match an existing variable
    const regex = new RegExp(`^${key}=.*$`, "m");

    if (regex.test(envContent)) {
        // Replace existing value
        envContent = envContent.replace(
            regex,
            `${key}=${value}`
        );
    } else {
        // Add variable if it doesn't exist
        if (
            envContent.length > 0 &&
            !envContent.endsWith("\n")
        ) {
            envContent += "\n";
        }

        envContent += `${key}=${value}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    console.log(`Updated ${key}:`);
    console.log(`   ${envPath}`);
}


// ============================================================
// Main Deployment
// ============================================================

async function main() {

    // --------------------------------------------------------
    // Connect to Hardhat network
    // --------------------------------------------------------

    const { ethers } = await network.connect();


    // --------------------------------------------------------
    // Get deployer
    // --------------------------------------------------------

    const [deployer] = await ethers.getSigners();

    console.log("\n========================================");
    console.log("       VerifyOnChain Deployment");
    console.log("========================================\n");

    console.log("Deploying from:", deployer.address);


    // --------------------------------------------------------
    // Get contract factory
    // --------------------------------------------------------

    const VerifyOnChain =
        await ethers.getContractFactory("VerifyOnChain");


    // --------------------------------------------------------
    // Deploy contract
    // --------------------------------------------------------

    const contract =
        await VerifyOnChain.deploy();

    await contract.waitForDeployment();


    // --------------------------------------------------------
    // Get deployed contract address
    // --------------------------------------------------------

    const address =
        await contract.getAddress();

    console.log("\nVerifyOnChain deployed to:");
    console.log(address);


    // ========================================================
    // Determine project paths
    // ========================================================

    const __filename =
        fileURLToPath(import.meta.url);

    const __dirname =
        path.dirname(__filename);

    // Assuming:
    //
    // project/
    // ├── verify_on_chain_contract/
    // │   └── scripts/
    // │       └── deploy.js
    // │
    // ├── verify_on_chain_frontend/
    // │   ├── .env
    // │   └── src/
    // │
    // └── verify_on_chain_backend/
    //     └── .env
    //

    const projectRoot =
        path.resolve(__dirname, "../..");


    // ========================================================
    // Update environment variables
    // ========================================================

    console.log("\n========================================");
    console.log("       Updating Environment Files");
    console.log("========================================\n");


    // -------------------------
    // Frontend
    // -------------------------

    const frontendEnvPath =
        path.join(
            projectRoot,
            "verify_on_chain_frontend",
            ".env"
        );

    updateEnvVariable(
        frontendEnvPath,
        "VITE_CONTRACT_ADDRESS",
        address
    );


    // -------------------------
    // Backend
    // -------------------------

    const backendEnvPath =
        path.join(
            projectRoot,
            "verify_on_chain_backend",
            ".env"
        );

    updateEnvVariable(
        backendEnvPath,
        "CONTRACT_ADDRESS",
        address
    );


    // ========================================================
    // Copy full artifact to frontend + backend
    // ========================================================

    console.log("\n========================================");
    console.log("       Copying Full Artifact");
    console.log("========================================\n");

    const artifactPath = path.join(
        __dirname,
        "../artifacts/contracts/VerifyOnChain.sol/VerifyOnChain.json"
    );

    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Contract artifact not found:\n${artifactPath}`);
    }

    const destinations = [
        "/home/max/Desktop/verify_on_chain/verify_on_chain_frontend/src/utils/VerifyOnChain.json",
        "/home/max/Desktop/verify_on_chain/verify_on_chain_backend/config/VerifyOnChain.json", // guessed, adjust if needed
    ];

    for (const dest of destinations) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(artifactPath, dest);
        console.log("Artifact copied to:", dest);
    }


    // ========================================================
    // Deployment complete
    // ========================================================

    console.log("\n========================================");
    console.log("       Deployment Complete");
    console.log("========================================\n");

    console.log("Contract:");
    console.log("VerifyOnChain");

    console.log("\nAddress:");
    console.log(address);

    console.log("\nFrontend:");
    console.log("VITE_CONTRACT_ADDRESS updated");

    console.log("\nBackend:");
    console.log("CONTRACT_ADDRESS updated");

    console.log("\nFrontend ABI:");
    console.log("VerifyOnChain.json updated");

    console.log("\n========================================\n");
}


// ============================================================
// Error handling
// ============================================================

main().catch((error) => {
    console.error("\nDeployment failed:");
    console.error(error);

    process.exitCode = 1;
});