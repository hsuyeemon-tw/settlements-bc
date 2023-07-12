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

import {IAwaitingSettlementRepo} from "@mojaloop/settlements-bc-domain-lib";
import {IAwaitingSettlement} from "@mojaloop/settlements-bc-public-types-lib";

export class AwaitingSettlementRepoMock implements IAwaitingSettlementRepo {
	awaitingSettlements: Array<IAwaitingSettlement> = [];

	async init(): Promise<void> {
		return Promise.resolve();
	}
	async destroy(): Promise<void>{
		return Promise.resolve();
	}

	storeAwaitingSettlement(awaitSettlement: IAwaitingSettlement): Promise<void>{
		if (awaitSettlement === undefined) return Promise.resolve();

		const newArray: Array<IAwaitingSettlement> = this.awaitingSettlements.filter(value => value.id !== awaitSettlement.id);
		newArray.push(awaitSettlement)
		this.awaitingSettlements = newArray;
		return Promise.resolve();
	}

	removeAwaitingSettlementByMatrixId(matrixId: string): Promise<void>{
		if (!matrixId) return Promise.resolve();

		const newArray: Array<IAwaitingSettlement> = this.awaitingSettlements.filter(value => value.matrix.id !== matrixId);
		this.awaitingSettlements = newArray;
		return Promise.resolve();
	}

	removeAwaitingSettlementByBatchId(batchId: string): Promise<void>{
		if (!batchId) return Promise.resolve();

		const newArray: Array<IAwaitingSettlement> = this.awaitingSettlements.filter(value => value.batch.id !== batchId);
		this.awaitingSettlements = newArray;
		return Promise.resolve();
	}

	getAwaitingSettlementByBatchId(batchId: string): Promise<IAwaitingSettlement | null>{
		if (batchId === undefined) return Promise.resolve(null);

		for (const awaitIter of this.awaitingSettlements) {
			if (awaitIter.batch.id === batchId) {
				return Promise.resolve(awaitIter);
			}
		}
		return Promise.resolve(null);
	}
}
