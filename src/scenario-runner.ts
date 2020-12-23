// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Runtime} from './runtime';
import {Federation} from './federation';
import {Launcher, Player} from './system';
import {Match, Module} from './matchmaker';
import {InputDevicePoster} from './input-device-poster';
import {RuntimeConfiguration} from './runtime-configuration';
import {Scenario} from './scenario';

export class ScenarioRunner {
    runtime: Runtime = null;
    systemFederation: Federation = null;
    lobbyFederation: Federation = null;
    battleFederation: Federation = null;
    player: Player = null;
    launcher: Launcher = null;
    module: Module = null;
    match: Match = null;
    scenario: Scenario = null;
    inputDevicePoster: InputDevicePoster = null;

    constructor(private scenarioFactory: (playerId: string) => Scenario) {
        this.runtime = new Runtime();
        this.runtime.startup(RuntimeConfiguration.autoDetect());
        this.systemFederation = this.runtime.joinFederation('000000000000000000000000');
        this.systemFederation.objects<Player>('Player').subscribe(player => {
            this.playerChanged(player);
        });
        this.systemFederation.objects<Launcher>('Launcher').subscribe(launcher => {
            this.launcherChanged(launcher);
        });
        this.inputDevicePoster = new InputDevicePoster();
    }

    private playerChanged(player: Player): void {
        if (player.$defined$changed && player.$defined) {
            this.player = player;
        }
        if (player.playerId$changed || player.playerName$changed || player.playerIcon$changed) {
            this.runtime.authenticate('',
                player.playerId || '',
                player.playerName || '',
                player.playerIcon || '');
        }
        if (player.playerId$changed) {
            if (player.playerId) {
                this.runtime.authenticate('', player.playerId, '', '');
                this.tryStartScenario();
            }
        }
    }

    private launcherChanged(launcher: Launcher) {
        if (launcher.$defined$changed && launcher.$defined) {
            this.launcher = launcher;
        }
        if (launcher.lobbyId$changed && launcher.lobbyId) {
            this.launcherJoinedLobby(launcher.lobbyId);
        }
        if (launcher.matchId$changed) {
            if (launcher.matchId) {
                this.match = this.lobbyFederation.getObjectOrNull(launcher.matchId) as Match;
            } else {
                this.match = null;
                if (this.battleFederation) {
                    this.launcherLeftMatch();
                }
            }
        }
    }

    private launcherJoinedLobby(federationId: string) {
        if (this.lobbyFederation && this.lobbyFederation.federationId !== federationId) {
            this.runtime.leaveFederation(federationId);
            this.lobbyFederation = null;
        }
        if (!this.lobbyFederation) {
            this.lobbyFederation = this.runtime.joinFederation(federationId);
            this.lobbyFederation.objects<Module>('Module').subscribe(module => {
                if (module.$defined$changed) {
                    this.module = module.$defined ? module : null;
                }
                if (module.ownerId$changed) {
                    this.tryStartScenario();
                }
            });
        }
    }

    private tryStartScenario() {
        if (this.module && this.player && this.module.ownerId === this.player.playerId && !this.scenario) {
            this.startScenario(this.scenarioFactory(this.player.playerId)).then(() => {
            }, reason => {
                console.error(reason);
            });
        }
    }

    private launcherLeftMatch() {
        if (this.scenario) {
            this.scenario.shutdown();
            this.scenario = null;
        }
        if (this.battleFederation) {
            this.runtime.leaveFederation(this.battleFederation.federationId);
            this.battleFederation = null;
        }
    }

    async startScenario(scenario: Scenario) {
        try {
            const result = await this.systemFederation.requestService('CreateMatch', {
                lobbyId: this.lobbyFederation.federationId,
                params: scenario.getParams()
            });
            const matchId = result.matchId as string;
            const match = this.lobbyFederation.getObjectOrNull(matchId);
            this.scenario = scenario;
            this.battleFederation = this.runtime.joinFederation(matchId);
            await this.pingBattleServices(this.battleFederation);
            scenario.startup(match, this.lobbyFederation, this.battleFederation);
        } catch (err) {
            console.error(err);
        }
    }

    private async pingBattleServices(battleFederation: Federation) {
        let retries = 0;
        while (true) {
            try {
                await battleFederation.requestService('PingBattleServices', {});
                return;
            } catch (err) {
                if (retries++ < 10) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                } else {
                    throw err;
                }
            }
        }
    }
}
