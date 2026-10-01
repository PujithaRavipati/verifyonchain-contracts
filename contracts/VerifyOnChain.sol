// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VerifyOnChain
 * @notice Stores certificate hashes on-chain for tamper-proof verification.
 *         Universities (authorized issuers) issue certificates by submitting
 *         a keccak256 hash of the certificate fields (including issuer address).
 *         The hash itself is the certificate's unique identifier — no separate
 *         certificate ID is used.
 */
contract VerifyOnChain is Ownable {

    struct Certificate {
        bytes32 fieldHash;
        address issuer;
        uint256 timestamp;
        bool isValid;
    }

    /// @notice fieldHash => Certificate
    mapping(bytes32 => Certificate) public certificates;

    /// @notice Addresses allowed to issue certificates
    mapping(address => bool) public authorizedIssuers;

    // ── Events ──────────────────────────────────────────────────────────

    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    event CertificateIssued(
        bytes32 indexed fieldHash,
        address indexed issuer,
        uint256 timestamp
    );
    event CertificateRevoked(bytes32 indexed fieldHash, uint256 timestamp);

    // ── Constructor ─────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Issuer Management (onlyOwner) ───────────────────────────────────

    /**
     * @notice Whitelist an address so it can issue certificates.
     * @dev VerifyOnChain: Authorize University Issuer
     * @param issuer The wallet address of the university.
     */
    function addAuthorizedIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @notice Remove an issuer's authorization (e.g. compromised key).
     * @dev VerifyOnChain: Remove University Issuer
     * @param issuer The wallet address to de-authorize.
     */
    function removeAuthorizedIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    // ── Issuance ────────────────────────────────────────────────────────

    /**
     * @notice Issue a new certificate on-chain.
     * @dev VerifyOnChain: Issue Academic Certificate
     * @param fieldHash  keccak256 hash of the certificate fields + issuer address.
     *                   This hash serves as the certificate's unique identifier.
     */
    function issueCertificate(bytes32 fieldHash) external {
        require(authorizedIssuers[msg.sender], "Not an authorized issuer");
        require(
            certificates[fieldHash].timestamp == 0,
            "Certificate already exists"
        );

        certificates[fieldHash] = Certificate({
            fieldHash: fieldHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            isValid: true
        });

        emit CertificateIssued(fieldHash, msg.sender, block.timestamp);
    }

    // ── Revocation ──────────────────────────────────────────────────────

    /**
     * @notice Revoke a certificate. Only the original issuer can revoke.
     * @dev VerifyOnChain: Revoke Academic Certificate
     * @param fieldHash  The certificate hash to revoke.
     */
    function revokeCertificate(bytes32 fieldHash) external {
        Certificate storage cert = certificates[fieldHash];
        require(cert.timestamp != 0, "Certificate does not exist");
        require(cert.issuer == msg.sender, "Not the original issuer");
        require(cert.isValid, "Already revoked");

        cert.isValid = false;
        emit CertificateRevoked(fieldHash, block.timestamp);
    }

    // ── Read / Verify ───────────────────────────────────────────────────

    /**
     * @notice Verify a certificate by its field hash.
     *         Verifiers compute the hash from raw fields + issuer address
     *         and call this function. If the hash exists on-chain and isValid
     *         is true, the certificate is authentic.
     *
     * @param fieldHash  The keccak256 hash to look up.
     * @return issuer    The address that issued the certificate.
     * @return timestamp Block timestamp when issued.
     * @return isValid   Whether the certificate is still valid.
     * @return exists    True if a certificate with this hash exists.
     */
    function verifyCertificate(
        bytes32 fieldHash
    )
        external
        view
        returns (
            address issuer,
            uint256 timestamp,
            bool isValid,
            bool exists
        )
    {
        Certificate storage cert = certificates[fieldHash];
        if (cert.timestamp == 0) {
            return (address(0), 0, false, false);
        }
        return (cert.issuer, cert.timestamp, cert.isValid, true);
    }
}
