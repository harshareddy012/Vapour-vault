# Distributed File System with Shamir's Secret Sharing (DFS_SSS) - Architecture Specification

## 1. Overview & Core Philosophy

**DFS_SSS** is an enterprise-grade distributed file system designed for zero-trust environments. It guarantees:
- **Confidentiality**: Files are symmetrically encrypted using **AES-256-GCM**.
- **Information-Theoretic Security**: Encryption keys are split using **Shamir's Secret Sharing (SSS)** over Finite Fields $GF(2^8)$. Individual storage nodes store only encrypted shares and have zero knowledge of the master key.
- **Fault Tolerance**: Up to $(N - K)$ storage node failures can occur without affecting file availability or recovery.

---

## 2. Cryptographic Flow

```
UPLOAD PIPELINE
File Upload -> Generate 256-bit AES Key & IV -> AES-256-GCM Encrypt Payload
                    |
                    v
          Split AES Key into N Shares (K-of-N Threshold over GF(2^8))
                    |
                    v
    Distribute Encrypted Payload Chunk & Shares to Storage Cluster Nodes 1..N
```

```
RECONSTRUCTION PIPELINE
Request File -> Query Healthy Storage Nodes -> Retrieve Encrypted Payload + K Key Shares
                    |
                    v
   Reconstruct AES Key via Lagrange Interpolation over GF(2^8) at x = 0
                    |
                    v
        Decrypt Payload via AES-256-GCM -> Stream Original File to User
```

---

## 3. Mathematical Foundations: Shamir Secret Sharing in $GF(2^8)$

Shamir's Secret Sharing operates by constructing a random polynomial of degree $K-1$:

$$f(x) = a_0 \oplus a_1 x \oplus a_2 x^2 \oplus \dots \oplus a_{K-1} x^{K-1} \pmod{P(x)}$$

where:
- $a_0$ is the secret AES key byte.
- $a_1, a_2, \dots, a_{K-1}$ are randomly chosen coefficients in $GF(2^8)$.
- $P(x) = x^8 + x^4 + x^3 + x + 1$ (0x11b) is the irreducible polynomial for $GF(2^8)$.

### Secret Reconstruction via Lagrange Interpolation

Given any $K$ distinct points $(x_1, y_1), (x_2, y_2), \dots, (x_K, y_K)$:

$$f(0) = \bigoplus_{i=1}^{K} y_i \bigotimes \left( \prod_{j \ne i} \frac{x_j}{x_j \oplus x_i} \right)$$

Fewer than $K$ shares yield zero information about $a_0$.
