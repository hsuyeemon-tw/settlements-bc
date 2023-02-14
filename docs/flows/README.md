# Settlement Flows
This document describes how the Settlement component functions, including detailing how data flows as cleared transfers are processed through settlement.    
The current design of the new Settlement component expects use or integration with one of the following two Mojaloop transaction clearing services:
- The `Central-Ledger` service which records cleared transactions for the current Production version, as at Februar 2023.
- The `Transfers BC` service which records cleared transactions for the not yet released Mojaloop major version that aligns with the full implementation of the Reference Architecture (informally referred to as `vNext`).

The sections that follow detail each stage of the settlement process.  
At a high level, the settlement process entails:
- [Creating Settlement Transfers](#1-creating-settlement-transfers) 
- [Fulfilling Settlement Obligations](#2-fulfilling-settlement-obligations) 
- [Assigning Settlement Batches](#3-assigning-settlement-batches)
- [References](#4-references)

The Settlement BC service is designed for use by one of two Mojaloop transaction clearing services.  
This is dependent on which major version of the Mojaloop software has been deployed:
- The `Central-Ledger` service records all cleared transactions for the current production Mojaloop major version 1.
- The `Transfers BC` service records all cleared transactions for the anticipated, not yet released Mojaloop major version 'vNext'. 

## 1. Creating Settlement Transfers
This process is initiated when the Settlement component receives cleared Transfers to settle.  
The process creates settlement obligations between the payer (debtor) and payee (creditor) DFSPs 
by creating settlement transfers which are deterministically allocated to settlement batches. 

## Settlement from Transfers BC
The diagram below illustrates how Transfers that were cleared by the **Transfers BC** get settled:
## ![Settlement Transfer Flow for Transfers BC](./01-settlement-transfer-bc.svg "Settlement Transfer Transfers BC")

### Settlement from Central-Ledger
The diagram below illustrates how Transfers that were cleared by the **Central-Ledger** service get settled:
## ![Settlement Transfer Flow for Central-Ledger](./01-settlement-transfer-cl.svg "Settlement Transfer Central-Ledger")

### Settlement Transfer Model
A Settlement Transfer is the data object shared between the Settlement service and the service that it interacts with (e.g. Central-Ledger or the Transfers BC).    
The table below gives a view of the Settlement Transfer fields:
 
> TODO @jason Add detailed section on what the settlement matrix generation even does 

| Field                        | Definition                         | Description                                                                                                                                          |
|------------------------------|------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`                         | `null / string`                    | The global unique identifier for settlement transfer. Assigned by Settlement                                                                         |
| `transferId`                 | `string`                           | An external id used by the external services (Central-Ledger / Transfers BC) used to identify a transaction                                          |
| `currencyCode`               | `string`                           | The currency code for a settlement transfer as described in ISO-4217                                                                                 |
| `currencyDecimals`           | `number / null`                    | The number of decimal precisions for the `currencyCode`                                                                                              |
| `amount`                     | `string`                           | The transfer amount in minor denomination format (cents/fills) as text (`string)                                                                     |
| `debitParticipantAccountId`  | `string`                           | The participant account to be debited. The actual settlement account will be derived from the provided debit account during a transfer               |
| `creditParticipantAccountId` | `string`                           | The participant account to be credited. The actual settlement account will be derived from the provided credit account during a transfer             |
| `timestamp`                  | `number`                           | The timestamp of the original committed/fulfilled transfer. Settlement batch processing make use of the timestamp to allocate transfers to batches   |
| `settlementModel`            | `string`                           | The settlement model assigned to the transfer (Examples include `DEFAULT`, `FX` and `REMITTENCE`). Mandatory for a transfer create                   |
| `batch`                      | __Optional__ `ISettlementBatchDto` | The settlement batch gets assigned during the settlement process. The value should not be set as part of the settlement transfer create process      |
* See `ISettlementTransferDto` at https://github.com/mojaloop/settlements-bc/blob/main/packages/public-types-lib/src/index.ts

### Settlement Batch Account Model
A settlement batch account is an account created for a participant for a batch.
The `externalId` may be used to link the participant account with the settlement batch account.
The table below gives a view of the Settlement Batch Account fields:

| Field                  | Definition                                | Description                                                                                                                             |
|------------------------|-------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| `id`                   | `null / string`                           | The global unique identifier for settlement batch account. Assigned by Settlement                                                       |
| `participantAccountId` | `string`                                  | The id used to identify the participant account in the external services (Central-Ledger / Participants BC) used to identify an account |
| `settlementBatch`      | `null / ISettlementBatchDto` __Optional__ | The settlement batch the account is assigned to                                                                                         |
| `currencyCode`         | `string`                                  | The currency code for a settlement batch account as described in ISO-4217                                                               |
| `currencyDecimals`     | `number / null`                           | The number of decimal precisions for the `currencyCode`                                                                                 |
| `debitBalance`         | `string`                                  | The settlement account debit balance amount in minor denomination format (cents/fills) as text (`string)                                |
| `creditBalance`        | `string`                                  | The settlement account credit balance amount in minor denomination format (cents/fills) as text (`string)                               |
| `timestamp`            | `number`                                  | The timestamp for when the settlement batch account was created                                                                         |
* See `ISettlementBatchAccountDto` at https://github.com/mojaloop/settlements-bc/blob/main/packages/public-types-lib/src/index.ts

### Settlement Batch Model
A settlement batch is a collection of Settlement Transfers that should be settled together. 
The table below gives a view of the Settlement Batch fields:

| Field              | Definition              | Description                                                                                                                                                                                         |
|--------------------|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`               | `null / string`         | The global unique identifier for settlement batch account. Assigned by Settlement                                                                                                                   |
| `timestamp`        | `number`                | The timestamp for when the settlement batch account was created                                                                                                                                     |
| `settlementModel`  | `string`                | The settlement model assigned to the transfer at time of transfer prepare (outside of the Settlement service) (Examples include `DEFAULT`, `FX` and `REMITTENCE`). Mandatory for a transfer create. |
| `currency`         | `string`                | The currency for a settlement batch as described in ISO-4217                                                                                                                                        |
| `batchSequence`    | `number`                | The sequence for a batch. See batch assignment section                                                                                                                                              |
| `batchIdentifier`  | `string`                | The settlement account debit balance amount in minor denomination format (cents/fills) as text (`string). Example include `USD.2023.1.26.13.33`                                                     |
| `batchStatus`      | `SettlementBatchStatus` | The status for a settlement batch. `OPEN` = Batch is open and may receive settlement transfers , `CLOSED` = Batch is closed and no more transactions will be allocated to a closed batch            |
* See `ISettlementBatchDto` at https://github.com/mojaloop/settlements-bc/blob/main/packages/public-types-lib/src/index.ts

### Settlement Model Relationships
The diagram below illustrates the relationships between persisted settlement data:
## ![Settlement Data Relationships](./03-settlement-model.svg "Settlement Data Relationships")

## 2. Fulfilling Settlement Obligations
This process begins with requesting the settlement matrix for a specified timespan __(Generate Settlement Matrix)__.    

For a specified period of time, requesting the settlement matrix closes any open batches and
returns a result set of all the DR/CR balances of the settlement batches.  
The purpose of the matrix is to view the DR/CR balances for batches, and the payer/payee
settlement account balances for those batches.  

Once the batches are closed, the external services (i.e. Central-Ledger, Transfers BC, Participants BC) 
that interfaces with the Settlement-BC gets notified of the settlement transfers being fulfilled.

### Settlement Matrix - Central-Ledger
The flow below is how a Settlement Matrix is created for Central-Ledger:
## ![Settlement Matrix Flow for Central-Ledger](./02-settlement-matrix-cl.svg "ST CL")

## Settlement Matrix - Participants BC
The flow below is how a fulfilled Matrix is created for Participants BC:
## ![Settlement Matrix Flow for Transfers BC](./02-settlement-matrix-bc.svg "ST TBC")

### Settlement Matrix Model
The settlement matrix is the data object shared between Settlement and the external services during settlement matrix generation.
The table below illustrates the Settlement Matrix fields:

| Field                   | Definition                    | Description                                                        |
|-------------------------|-------------------------------|--------------------------------------------------------------------|
| `fromDate`              | `number`                      | The from date to which to generate the settlement matrix from      |
| `toDate`                | `number`                      | The from date to which to generate the settlement matrix until     |
| `settlementModel`       | `string`                      | The settlement model for which the settlement model is generated   |
| `generationDuration`    | `number`                      | The time in milliseconds it took to generate the settlement matrix |
| `batches`               | `ISettlementMatrixBatchDto[]` | The settlement matrix batches that were processed                  |
* See `ISettlementMatrixDto` at https://github.com/mojaloop/settlements-bc/blob/main/packages/public-types-lib/src/index.ts

### Settlement Matrix Batch Model
The settlement matrix batch data object is a child object for the [Settlement Matrix Model](#settlement-matrix-model)
The Settlement Matrix Batch has numerous Settlement Accounts associated with the batch. 
The table below illustrates the Settlement Matrix Batch fields:

| Field              | Definition                                     | Description                                                                                             |
|--------------------|------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `batchIdentifier`  | `string`                                       | The batch matrix unique batch identifier `e.g DEFAULT.USD:USD.2023.1.24.14.28.1`                        |
| `batchStatus`      | `SettlementBatchStatus`                        | The batch status prior to the settlement matrix being generated                                         |
| `batchStatusNew`   | `SettlementBatchStatus`                        | The current batch status as a result of the settlement matrix request                                   |
| `currencyCode`     | `string`                                       | The currency code as described in ISO-4217                                                              |
| `debitBalance`     | `string`                                       | The settlement batch debit balance amount in minor denomination format (cents/fills) as text (`string)  |
| `creditBalance`    | `string`                                       | The settlement batch credit balance amount in minor denomination format (cents/fills) as text (`string) |
| `batchAccounts`    | `ISettlementMatrixSettlementBatchAccountDto[]` | The credit balance amount in minor denomination format (cents/fills) as text (`string)                  |
* See `ISettlementMatrixBatchDto` at https://github.com/mojaloop/settlements-bc/blob/main/packages/public-types-lib/src/index.ts

### Settlement Matrix Batch Account Model
The Settlement Matrix Batch Account belongs to a [Settlement Matrix Batch](#settlement-matrix-batch-model).
The table below illustrates the Settlement Matrix Batch Account fields:

| Field           | Definition                    | Description                                                                                                          |
|-----------------|-------------------------------|----------------------------------------------------------------------------------------------------------------------|
| `id`            | `null / string`               | The global unique identifier for settlement batch account. Assigned by Settlement                                    |
| `participantId` | `string`                      | An participantId id used by the external services (Central-Ledger / Transfers BC) used to identify a settled account |
| `currencyCode`  | `string`                      | The currency code as described in ISO-4217 for the batch account                                                     |
| `debitBalance`  | `string`                      | The settlement batch account debit balance amount in minor denomination format (cents/fills) as text (`string)       |
| `creditBalance` | `string`                      | The settlement batch account credit balance amount in minor denomination format (cents/fills) as text (`string)      |
* See `ISettlementMatrixSettlementBatchAccountDto` at https://github.com/mojaloop/settlements-bc/blob/main/packages/public-types-lib/src/index.ts

## 3. Assigning Settlement Batches
This section describes the process of assigning a Transfer to a batch, for settlement.

In the previous implementation, the Settlement component always assigned a Transfer to the only open settlement window at the time of settlement.  
In the new implementation, the Settlement component uses fields of a Transfer to determine the settlement batch and multiple settlement batches can be open at a time, based on the:
- Timestamp of a Transfer.
- Settlement model of a Transfer.
- Configured duration/timespan for any settlement batch.

A transaction will be allocated to a newly created batch when it falls within the time period of a batch that is already `CLOSED`. This is because Settlement batches that are in a `CLOSED` state cannot be altered.

Instead of assigning a settlement transfer to the current open settlement window, the Settlement vNext would be responsible for allocating the transfer itself.
Transfers-BC / Central-Ledger: At time of fulfil, produce an event to be consumed eventually by Settlement. 
Settlement-BC would then be responsible for allocating a transfer to a settlement batch and settlement model, independently of other components.

Late settlement transactions will be allocated to a newly created batch (since the batch for timespan X would have already been closed).
Example: 
Lets assume that the transfer timestamp for a late transaction is `2023.1.26.13.33.59`. 
The batch meant for the "late" / delayed transfer is meant for batch:
- `DEFAULT.USD:USD.2023.1.26.13.33.001`
Due to the batch being in a closed state, the following batch will be created for the transfer:
- `DEFAULT.USD:USD.2023.1.26.13.33.002`

The above ensures the requirements are met:
- Transfers will always be allocated to a batch, irrespective of the timestamp and batch statuses
- Settlement batches that are in a `CLOSED` state cannot be altered 
- Reconciliation is achieved by re-running the Settlement Matrix for the delayed transfer, which will automatically rectify settlement inconsistencies 

## 4. References
The following documentation provides insight into Settlements.

| Ref # | Document                                          | Link                                                                                                                                   | 
|-------|---------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `01.` | **Technical Flows**                               | `*.puml`                                                                                                                               |
| `02.` | **Settlement Version 2**                          | `../Settlement Version 2.pptx`                                                                                                         |
| `03.` | **Settlement Operational Implementation**         | https://docs.mojaloop.io/business-operations-framework-docs/guide/SettlementBC.html#core-settlement-operations                         |
| `04.` | **Reference Architecture**                        | https://mojaloop.github.io/reference-architecture-doc/boundedContexts/settlements/                                                     |
| `05.` | **MIRO Board (Reference Architecture)**           | https://miro.com/app/board/o9J_lJyA1TA=/                                                                                               |
| `06.` | **Settlement Functionality in MJL**               | https://docs.google.com/presentation/d/19uy6pO_igmQ9uZRnKyZkXD8a8uyMKQcn/edit#slide=id.p1                                              |
| `07.` | **DA Work Sessions**                              | https://docs.google.com/document/d/1Nm6B_tSR1mOM0LEzxZ9uQnGwXkruBeYB2slgYK1Kflo/edit#heading=h.6w64vxvw6er4                            |
| `08.` | **Admin API - Settlement Models**                 | https://github.com/mojaloop/mojaloop-specification/blob/master/admin-api/admin-api-specification-v1.0.md#api-resource-settlementmodels |
| `09.` | **Mojaloop Product Timeline**                     | https://miro.com/app/board/uXjVPA3hBgE=/                                                                                               |
| `10.` | **Settlement Basic Concepts**                     | https://docs.mojaloop.io/mojaloop-business-docs/HubOperations/Settlement/settlement-basic-concepts.html                                |
| `11.` | **Ledgers in the Hub**                            | https://docs.mojaloop.io/mojaloop-business-docs/HubOperations/Settlement/ledgers-in-the-hub.html                                       |
| `12.` | **Mojaloop 2.0 Reference Architecture - Sheet 8** | https://docs.google.com/spreadsheets/d/1ITmAesHjRZICC0EUNV8vUVV8VDnKLjbSKu_dzhEa5Fw/edit#gid=580827044                                 |
