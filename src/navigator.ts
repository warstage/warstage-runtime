
import {Subject} from 'rxjs';
import {Launcher, Player} from './system';
import {Federation} from './federation';
import {Match, Module} from './matchmaker';
import {InputDevicePoster} from './input-device-poster';
import {Runtime} from './runtime';

interface System {
    readonly onChangePlayer: Subject<Player>;
    federation: Federation;
    player: Player;
    launcher: Launcher;
}

interface Lobby {
    readonly onEnterLobby: Subject<void>;
    readonly onLeaveLobby: Subject<void>;
    readonly onEnterMatch: Subject<void>;
    readonly onLeaveMatch: Subject<void>;
    federation: Federation;
    module: Module;
    match: Match;
    owner: boolean;
}

interface Battle {
    readonly onEnterBattle: Subject<EnterBattleEvent>;
    readonly onLeaveBattle: Subject<void>;
    federation: Federation;
    owner: boolean;
}

export interface EnterBattleEvent {
    startup: boolean;
}

export class Navigator {
    private inputDevicePoster: InputDevicePoster = null;

    readonly system: System = {
        onChangePlayer: new Subject<Player>(),
        federation: null,
        player: null,
        launcher: null
    };
    readonly lobby: Lobby = {
        onEnterLobby: new Subject<void>(),
        onLeaveLobby: new Subject<void>(),
        onEnterMatch: new Subject<void>(),
        onLeaveMatch: new Subject<void>(),
        federation: null,
        module: null,
        match: null,
        owner: false
    };
    readonly battle: Battle = {
        onEnterBattle: new Subject<EnterBattleEvent>(),
        onLeaveBattle: new Subject<void>(),
        federation: null,
        owner: false
    };

    constructor(public runtime: Runtime) {
        this.inputDevicePoster = new InputDevicePoster();
        this.system.federation = this.runtime.joinFederation('000000000000000000000000');
        this.system.federation.objects<Player>('Player').subscribe(player => {
            this.playerChanged_(player);
        });
        this.system.federation.objects<Launcher>('Launcher').subscribe(launcher => {
            this.launcherChanged_(launcher);
        });
    }

    private playerChanged_(player: Player): void {
        if (player.$defined$changed && player.$defined) {
            this.system.player = player;
        }
        if (player.playerId$changed || player.playerName$changed || player.playerIcon$changed) {
            this.runtime.authenticate('',
                player.playerId || '',
                player.playerName || '',
                player.playerIcon || '');
        }
        this.system.onChangePlayer.next(player);
    }

    private launcherChanged_(launcher: Launcher) {
        if (launcher.$defined$changed && launcher.$defined) {
            this.system.launcher = launcher;
        }
        if (launcher.lobbyId$changed && launcher.lobbyId) {
            if (this.lobby.federation && this.lobby.federation.federationId !== launcher.lobbyId) {
                this.runtime.leaveFederation(this.lobby.federation.federationId);
                this.lobby.federation = null;
                this.lobby.module = null;
            }
            if (!this.lobby.federation) {
                this.lobby.federation = this.runtime.joinFederation(launcher.lobbyId);
                this.lobby.federation.objects<Module>('Module').subscribe(module => {
                    if (module.$defined$changed) {
                        this.lobby.module = module.$defined ? module : null;
                    }
                });
                this.lobby.onEnterLobby.next();
            }
        }
        if (launcher.matchId$changed) {
            this.launcherMatchIdChanged();
        }
    }

    private launcherMatchIdChanged() {
        const newMatchId = this.system.launcher.matchId;
        const oldMatchId = this.lobby.match ? this.lobby.match.$id : null;
        if (newMatchId === oldMatchId) {
            return;
        }
        if (this.battle.federation) {
            this.battle.onLeaveBattle.next();
            this.runtime.leaveFederation(this.battle.federation.federationId);
            this.battle.federation = null;
        }
        if (this.lobby.match) {
            this.lobby.onLeaveMatch.next();
            this.lobby.match = null;
        }
        if (newMatchId) {
            this.lobby.match = this.lobby.federation.getObjectOrNull(newMatchId) as Match;
            this.lobby.onEnterMatch.next();
            this.battle.federation = this.runtime.joinFederation(newMatchId);
            this.battle.onEnterBattle.next();
        }
    }

    async navigateToModule(moduleUrl: string) {
        await this.system.federation.requestService('LaunchModule', {
            moduleUrl
        });
    }

    async navigateToMatch(matchId: string) {
        await this.system.federation.requestService('EnterMatch', {
            lobbyId: this.lobby.federation.federationId,
            matchId
        });
        if (this.lobby.federation) {
            await this.lobby.federation.requestService('JoinMatchAsSpectator', {
                match: {$id: matchId}
            });
        }
    }

    async createMatch(params: any): Promise<Match> {
        const response = await this.system.federation.requestService('CreateMatch', {
            lobbyId: this.lobby.federation.federationId,
            params
        });
        const matchId = response.matchId as string;
        this.battle.federation = this.runtime.joinFederation(matchId);
        this.battle.onEnterBattle.next();
        await this.pingBattleServices_();
        return this.lobby.federation.getObjectOrNull(matchId) as Match;
    }

    private async pingBattleServices_(): Promise<void> {
        let retries = 0;
        while (true) {
            try {
                await this.battle.federation.requestService('PingBattleServices', {});
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
