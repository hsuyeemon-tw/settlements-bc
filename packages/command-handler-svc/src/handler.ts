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

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IMessage,IMessageConsumer, CommandMsg} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {SettlementsBCTopics} from "@mojaloop/platform-shared-lib-public-messages-lib";

import {
	CreateSettlementModelCmd,
	CloseMatrixCmd,
	CloseMatrixCmdPayload,
	CreateStaticMatrixCmd,
	CreateStaticMatrixCmdPayload,
	CreateDynamicMatrixCmd,
	CreateDynamicMatrixCmdPayload,
	ProcessTransferCmd,
	RecalculateMatrixCmd,
	RecalculateMatrixCmdPayload,
	SettlementsAggregate,
	SettleMatrixCmd,
	SettleMatrixCmdPayload,
	DisputeMatrixCmd,
	DisputeMatrixCmdPayload,
	AddBatchesToMatrixCmd,
	AddBatchesToMatrixCmdPayload,
	RemoveBatchesFromMatrixCmd,
	RemoveBatchesFromMatrixCmdPayload,
	LockMatrixCmd,
	LockMatrixCmdPayload,
	UnlockMatrixCmd,
	UnlockMatrixCmdPayload,
	CreateSettlementModelCmdPayload,
	MarkMatrixOutOfSyncCmd, MarkMatrixOutOfSyncCmdPayload
} from "@mojaloop/settlements-bc-domain-lib";
import {CallSecurityContext} from "@mojaloop/security-bc-public-types-lib";
import {MLKafkaJsonConsumer} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {ILoginHelper, ITokenHelper, UnauthorizedError} from "@mojaloop/security-bc-public-types-lib";
import {ISettlementConfig } from "@mojaloop/settlements-bc-public-types-lib";

export class SettlementsCommandHandler{
	private _logger: ILogger;
	private _auditClient: IAuditClient;
	private _messageConsumer: IMessageConsumer;
	private _settlementsAgg: SettlementsAggregate;
	private _loginHelper: ILoginHelper;

    constructor(logger: ILogger, auditClient:IAuditClient, messageConsumer: IMessageConsumer, agg: SettlementsAggregate, loginHelper:ILoginHelper) {
		this._logger = logger.createChild(this.constructor.name);
		this._auditClient = auditClient;
		this._messageConsumer = messageConsumer;
		this._settlementsAgg = agg;
		this._loginHelper = loginHelper;
	}

	async start():Promise<void>{
		this._messageConsumer.setTopics([SettlementsBCTopics.Commands]);
		this._messageConsumer.setCallbackFn(this._msgHandler.bind(this));
		await this._messageConsumer.connect();
		await this._messageConsumer.startAndWaitForRebalance();
	}

	private async _msgHandler(message: IMessage): Promise<void>{
		// eslint-disable-next-line no-async-promise-executor
		return await new Promise<void>(async (resolve) => {
			this._logger.debug(`Got message in TransfersCommandHandler with name: ${message.msgName}`);
			try {
				const sectCtx = await this._getServiceSecContext();

				switch (message.msgName) {
					case ProcessTransferCmd.name:
						await this._settlementsAgg.processTransferCmd(sectCtx, message as ProcessTransferCmd);
						break;
					case CreateSettlementModelCmd.name:
						// eslint-disable-next-line no-case-declarations
						const createSettlementConfig = message.payload as CreateSettlementModelCmdPayload;
						
						await this._settlementsAgg.createSettlementConfig(
							sectCtx,
							createSettlementConfig
						);
						break;
					case CreateDynamicMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const createPayload = message.payload as CreateDynamicMatrixCmdPayload;
						await this._settlementsAgg.createDynamicSettlementMatrix(
							sectCtx,
							createPayload.matrixId,
							createPayload.currencyCodes,
							createPayload.settlementModel,
							createPayload.batchStatuses,
							createPayload.fromDate,
							createPayload.toDate
						);
						break;
					case CreateStaticMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const staticMatrix = message.payload as CreateStaticMatrixCmdPayload;
						await this._settlementsAgg.createStaticSettlementMatrix(
							sectCtx,
							staticMatrix.matrixId,
							staticMatrix.batchIds
						);
						break;
					case RecalculateMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const recalcPayload = message.payload as RecalculateMatrixCmdPayload;
						await this._settlementsAgg.recalculateSettlementMatrix(
							sectCtx,
							recalcPayload.matrixId
						);
						break;
					case CloseMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const closePayload = message.payload as CloseMatrixCmdPayload;
						await this._settlementsAgg.closeSettlementMatrix(
							sectCtx,
							closePayload.matrixId
						);
						break;
					case SettleMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const settlePayload = message.payload as SettleMatrixCmdPayload;
						await this._settlementsAgg.settleSettlementMatrix(
							sectCtx,
							settlePayload.matrixId
						);
						break;
					case DisputeMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const disputePayload = message.payload as DisputeMatrixCmdPayload;
						await this._settlementsAgg.disputeSettlementMatrix(
							sectCtx,
							disputePayload.matrixId
						);
						break;
					case LockMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const lockAwaitPayload = message.payload as LockMatrixCmdPayload;
						await this._settlementsAgg.lockSettlementMatrixForAwaitingSettlement(
							sectCtx,
							lockAwaitPayload.matrixId
						);
						break;
					case UnlockMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const unlockAwaitPayload = message.payload as UnlockMatrixCmdPayload;
						await this._settlementsAgg.unLockSettlementMatrixFromAwaitingSettlement(
							sectCtx,
							unlockAwaitPayload.matrixId
						);
						break;
					case AddBatchesToMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const addPayload = message.payload as AddBatchesToMatrixCmdPayload;
						await this._settlementsAgg.addBatchesToStaticSettlementMatrix(
							sectCtx,
							addPayload.matrixId,
							addPayload.batchIds
						);
						break;
					case RemoveBatchesFromMatrixCmd.name:
						// eslint-disable-next-line no-case-declarations
						const removePayload = message.payload as RemoveBatchesFromMatrixCmdPayload;
						await this._settlementsAgg.removeBatchesFromStaticSettlementMatrix(
							sectCtx,
							removePayload.matrixId,
							removePayload.batchIds
						);
						break;
					case MarkMatrixOutOfSyncCmd.name:
						// eslint-disable-next-line no-case-declarations
						const batchUpdatedPayload = message.payload as MarkMatrixOutOfSyncCmdPayload;
						await this._settlementsAgg.markMatrixOutOfSyncWhereBatch(
							sectCtx,
							batchUpdatedPayload.originMatrixId,
							batchUpdatedPayload.batchIds
						);
						break;
					default: {
						this._logger.isWarnEnabled() && this._logger.warn(`TransfersCommandHandler - unknown command - msgName: ${message?.msgName} msgKey: ${message?.msgKey} msgId: ${message?.msgId}`);
					}
				}

			}catch(err: unknown){
				this._logger.error(err, `TransfersCommandHandler - processing command - ${message?.msgName}:${message?.msgKey}:${message?.msgId} - Error: ${(err as Error)?.message?.toString()}`);
			}finally {
				resolve();
			}
		});
	}

	private async _getServiceSecContext():Promise<CallSecurityContext>{
		// this will only fetch a new token when the current one is expired or null
		const token = await this._loginHelper.getToken();
		if(!token){
			throw new UnauthorizedError("Could not get a token for SettlementsCommandHandler");
		}

		// TODO producing a CallSecurityContext from a token should be from the security client lib, not here
		const secCts: CallSecurityContext = {
			clientId: token.payload.azp,
			accessToken: token.accessToken,
			rolesIds:token.payload.roles,
			username: null
		};
		return secCts;
	}


	async stop():Promise<void>{
		await this._messageConsumer.stop();
	}

}
