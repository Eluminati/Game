import { BDOGameLobbyFactory } from '~bdo/routes/BDOGameLobby';
import { ServerRoute } from '~server/lib/ServerRoute';

/**
 * serves the game window to the client where the game will be executed in.
 *
 * @class GameLobby
 * @extends ReturnType<BDOGameLobbyFactory<ServerRoute>>
 */
export default class GameLobby extends BDOGameLobbyFactory(ServerRoute) { }
