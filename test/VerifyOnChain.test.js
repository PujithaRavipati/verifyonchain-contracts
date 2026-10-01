import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.create();

describe("VerifyOnChain", function () {
    let contract;
    let owner, issuer, otherUser;

    let sampleFieldHash;

    beforeEach(async function () {
        [owner, issuer, otherUser] = await ethers.getSigners();

        // Hash: firstName, lastName, dob, studentId, percentile, issuerAddress
        sampleFieldHash = ethers.solidityPackedKeccak256(
            ["string", "string", "string", "string", "uint256", "address"],
            ["John", "Doe", "2000-01-15", "21BCE7777", 9550, issuer.address]
        );

        const VerifyOnChain = await ethers.getContractFactory("VerifyOnChain");
        contract = await VerifyOnChain.deploy();
        await contract.waitForDeployment();
    });

    // ── Test 1: Unauthorized address tries to issue → reverts ────────────
    it("should revert when unauthorized address tries to issue", async function () {
        await expect(
            contract.connect(issuer).issueCertificate(sampleFieldHash)
        ).to.be.revertedWith("Not an authorized issuer");
    });

    // ── Test 2: Admin whitelists → issuer can issue successfully ─────────
    it("should allow an authorized issuer to issue a certificate", async function () {
        await contract.connect(owner).addAuthorizedIssuer(issuer.address);

        await expect(
            contract.connect(issuer).issueCertificate(sampleFieldHash)
        ).to.emit(contract, "CertificateIssued");
    });

    // ── Test 3: Issuing same hash twice → reverts ───────────────────────
    it("should revert when issuing the same hash twice", async function () {
        await contract.connect(owner).addAuthorizedIssuer(issuer.address);
        await contract.connect(issuer).issueCertificate(sampleFieldHash);

        await expect(
            contract.connect(issuer).issueCertificate(sampleFieldHash)
        ).to.be.revertedWith("Certificate already exists");
    });

    // ── Test 4: Verify returns correct values for an issued cert ────────
    it("should return correct values when verifying an issued certificate", async function () {
        await contract.connect(owner).addAuthorizedIssuer(issuer.address);
        await contract.connect(issuer).issueCertificate(sampleFieldHash);

        const [certIssuer, timestamp, isValid, exists] =
            await contract.verifyCertificate(sampleFieldHash);

        expect(certIssuer).to.equal(issuer.address);
        expect(timestamp).to.be.greaterThan(0n);
        expect(isValid).to.be.true;
        expect(exists).to.be.true;
    });

    // ── Test 5: Non-issuer tries to revoke → reverts ────────────────────
    it("should revert when non-issuer tries to revoke", async function () {
        await contract.connect(owner).addAuthorizedIssuer(issuer.address);
        await contract.connect(issuer).issueCertificate(sampleFieldHash);

        await expect(
            contract.connect(otherUser).revokeCertificate(sampleFieldHash)
        ).to.be.revertedWith("Not the original issuer");
    });

    // ── Test 6: Original issuer revokes → isValid becomes false ─────────
    it("should allow the original issuer to revoke their certificate", async function () {
        await contract.connect(owner).addAuthorizedIssuer(issuer.address);
        await contract.connect(issuer).issueCertificate(sampleFieldHash);

        await expect(
            contract.connect(issuer).revokeCertificate(sampleFieldHash)
        ).to.emit(contract, "CertificateRevoked");

        const [, , isValid] = await contract.verifyCertificate(sampleFieldHash);
        expect(isValid).to.be.false;
    });

    // ── Test 7: Revoking an already-revoked cert → reverts ──────────────
    it("should revert when revoking an already-revoked certificate", async function () {
        await contract.connect(owner).addAuthorizedIssuer(issuer.address);
        await contract.connect(issuer).issueCertificate(sampleFieldHash);
        await contract.connect(issuer).revokeCertificate(sampleFieldHash);

        await expect(
            contract.connect(issuer).revokeCertificate(sampleFieldHash)
        ).to.be.revertedWith("Already revoked");
    });

    // ── Test 8: Verify non-existent hash returns exists=false ───────────
    it("should return exists=false for a non-existent hash", async function () {
        const fakeHash = ethers.solidityPackedKeccak256(
            ["string"], ["nonexistent"]
        );
        const [, , , exists] = await contract.verifyCertificate(fakeHash);
        expect(exists).to.be.false;
    });

    // ── Test 9: Revoking non-existent cert → reverts ────────────────────
    it("should revert when revoking a non-existent certificate", async function () {
        const fakeHash = ethers.solidityPackedKeccak256(
            ["string"], ["nonexistent"]
        );
        await expect(
            contract.connect(issuer).revokeCertificate(fakeHash)
        ).to.be.revertedWith("Certificate does not exist");
    });

    // ── Test 10: Verify revoked cert returns isValid=false, exists=true ──
    it("should return isValid=false and exists=true for a revoked certificate", async function () {
        await contract.connect(owner).addAuthorizedIssuer(issuer.address);
        await contract.connect(issuer).issueCertificate(sampleFieldHash);
        await contract.connect(issuer).revokeCertificate(sampleFieldHash);

        const [certIssuer, timestamp, isValid, exists] =
            await contract.verifyCertificate(sampleFieldHash);

        expect(exists).to.be.true;
        expect(isValid).to.be.false;
        expect(certIssuer).to.equal(issuer.address);
        expect(timestamp).to.be.greaterThan(0n);
    });
});
