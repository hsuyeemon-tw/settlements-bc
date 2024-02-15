/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Coil
 * - Jason Bruwer <jason.bruwer@coil.com>

 --------------
 ******/

"use strict";

import {ISettlementBatchRepo, ISettlementBatchTransferRepo} from "@mojaloop/settlements-bc-domain-lib";
import {
	BatchTransferSearchResults,
	ISettlementBatchAccount,
	ISettlementBatchTransfer
} from "@mojaloop/settlements-bc-public-types-lib";

export class SettlementBatchTransferRepoTigerBeetle implements ISettlementBatchTransferRepo {
	private readonly batchRepo: ISettlementBatchRepo;
	constructor(batchRepo: ISettlementBatchRepo) {
		this.batchRepo = batchRepo;
	}

	async init(): Promise<void> {
		return Promise.resolve();
	}
	async destroy(): Promise<void>{
		return Promise.resolve();
	}

	async storeBatchTransfer(...batchTransfer: ISettlementBatchTransfer[]): Promise<void> {
		// Already stored via the adapter.
		return Promise.resolve();
	}

	async getBatchTransfersByBatchIds(
		batchIds: string[],
		pageIndex: number = 0,
        pageSize: number = 100,
	): Promise<BatchTransferSearchResults>{
		const accountsForTxnLookup : ISettlementBatchAccount[] = [];
		for (const id of batchIds) {
			const batch = await this.batchRepo.getBatch(id);
			if (!batch || batch.accounts) continue;

			const accounts: ISettlementBatchAccount[] = batch.accounts;
			for (const account of accounts) {
				const accWithIdExisting = accountsForTxnLookup.filter(
					itm => account.participantId === itm.participantId);
				if (!accWithIdExisting) accountsForTxnLookup.push(account);
			}
		}
		const searchResultsEmpty: BatchTransferSearchResults = {
			pageIndex: pageIndex,
			pageSize: pageSize,
			totalPages: 0,
			items: []
		};

		if (accountsForTxnLookup.length === 0) return Promise.resolve(searchResultsEmpty);

		// TODO need to fetch the accounts and then the transfers for the accounts.

		return Promise.resolve(searchResultsEmpty);
	}

	async getBatchTransfersByBatchNames(batchNames: string[]): Promise<ISettlementBatchTransfer[]> {
		return Promise.resolve([]);
	}

	async getBatchTransfersByTransferId(transferId: string): Promise<ISettlementBatchTransfer[]> {
		return Promise.resolve([]);
	}

	async getBatchTransfers(pageIndex?: number, pageSize?: number): Promise<BatchTransferSearchResults>{
		const searchResults: BatchTransferSearchResults = {
			pageIndex: pageIndex ? pageIndex : 0,
			pageSize: pageSize ? pageSize : 15,
			totalPages: 0,
			items: []
		};
		return Promise.resolve(searchResults);
	}
}
