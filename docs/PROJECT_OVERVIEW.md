# Project Overview

## Project Name

Distributed File Storage System using Shamir Secret Sharing (DFS_SSS)

---

## Objective

Build a secure distributed file storage system capable of storing encrypted files across multiple storage nodes while protecting the encryption key using Shamir Secret Sharing.

This project is designed to demonstrate concepts from:

- Distributed Systems
- Backend Engineering
- Cryptography
- Object Storage
- Fault Tolerance
- Modern Web Development

---

## Core Workflow

User uploads file

↓

Coordinator receives request

↓

File encrypted using AES-256-GCM

↓

AES key split using Shamir Secret Sharing

↓

Encrypted payload stored

↓

Secret shares distributed

↓

Metadata stored in PostgreSQL

---

## Tech Stack

Frontend

- React
- TypeScript
- TailwindCSS

Backend

- Express
- TypeScript

Database

- PostgreSQL
- Drizzle ORM

Storage

- MinIO

Logging

- Pino

Authentication

- JWT

Package Manager

- pnpm

---

## Learning Goals

Understand:

- Distributed architectures
- Storage systems
- Secret Sharing
- Encryption
- Docker
- Production backend architecture