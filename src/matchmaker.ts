import {ObjectRef} from './federation';

export interface Session extends ObjectRef {
    playerId: string;
    playerName: string;
    playerIcon: string;
    connected: boolean;
    match: Match;
    ready: boolean;
}

export interface Match extends ObjectRef {
    hostingPlayerId: string;
    teams: Team[];
    teamsMin: number;
    teamsMax: number;
    title: string;
    map: string;
    options: {
        teams?: boolean,
        map?: boolean,
        units?: boolean,
        editor?: boolean,
        sandbox?: boolean,
        deployment?: boolean
    };
    settings: {
        units?: string[],
        sandbox?: boolean,
        deployment?: number
    };
    editor?: boolean;
    started: boolean;
    ended: boolean;
    time: number;
    mapFile?: string; // offline only
}

export interface Slot extends ObjectRef {
    playerId: string;
}

export interface Team extends ObjectRef {
    slots: Slot[];
    position: number;

    outcome?: string;
    score?: number;
}
