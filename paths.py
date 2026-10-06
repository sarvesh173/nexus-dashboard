"""Where this project's inputs live, resolved from the environment.

Nothing here may hardcode a home directory. Every path is derived from an env
var with a working default, so the project runs unchanged on another machine
and a public checkout leaks no username.
"""
import os

HERMES_HOME = os.environ.get('HERMES_HOME') or os.path.expanduser('~/.hermes')
OMNIROUTE_HOME = os.environ.get('OMNIROUTE_HOME') or os.path.join(
    os.path.expanduser('~'), '.omniroute')
REPO_DIR = os.environ.get('NEXUS_DIR') or os.path.dirname(os.path.abspath(__file__))


def hermes_config_path():
    """The agent config this dashboard reads (read-only)."""
    return os.environ.get('HERMES_CONFIG') or os.path.join(HERMES_HOME, 'config.yaml')


def hermes_env_path():
    return os.path.join(HERMES_HOME, '.env')


def hermes_gateway_state_path():
    """The gateway's own heartbeat file: pid, state, platforms, profiles.

    Written by the Hermes gateway process, read here read-only. Absent whenever
    the gateway has never started (or has been stopped cleanly), so every caller
    has to treat a missing file as a real state, not an error to hide.
    """
    return os.path.join(HERMES_HOME, 'gateway_state.json')


def hermes_logs_dir():
    """Directory holding the rotating Hermes log files (gateway.log, ...).

    This is the DEFAULT profile's log directory. A profile that runs in its own
    process keeps its own copies under `hermes_profile_logs_dir()`.
    """
    return os.path.join(HERMES_HOME, 'logs')


def hermes_profiles_dir():
    """Directory holding one subdirectory per non-default Hermes profile.

    Not every served profile has an entry here: `default` logs into
    `hermes_logs_dir()` and has no profile subdirectory. Absence of a
    subdirectory is therefore a normal state, not an error, and every caller must
    handle it by falling back to the shared log.
    """
    return os.path.join(HERMES_HOME, 'profiles')


def hermes_profile_logs_dir(profile):
    """Log directory for one named profile.

    Returns a path whether or not it exists; the caller resolves and confines it
    before reading, because `profile` arrives from a query string and an
    unvalidated join of it would be a filesystem traversal.
    """
    return os.path.join(hermes_profiles_dir(), str(profile), 'logs')


def omniroute_env_path():
    return os.path.join(OMNIROUTE_HOME, '.env')


def omniroute_storage_path():
    """The proxy's own SQLite store: per-request model routing and token usage.

    Read-only to this dashboard. A missing file is a normal state (the proxy has
    never run here), so callers treat absence as data rather than as an error.
    """
    return os.path.join(OMNIROUTE_HOME, 'storage.sqlite')


def opencode_home():
    """Where the opencode CLI keeps its session store and rotating log."""
    return os.environ.get('OPENCODE_HOME') or os.path.join(
        os.path.expanduser('~'), '.local', 'share', 'opencode')


def opencode_db_path():
    """The CLI's session/message/part store - the live agent execution stream.

    This is the only source of truth for which model an agent is actually
    running and what it is currently doing. It is opened read-only and never
    written by this project.
    """
    return os.path.join(opencode_home(), 'opencode.db')


# The local OpenAI-compatible proxy. Overridable so a checkout carries no
# machine-specific port either.
OMNI_BASE = os.environ.get('OMNIROUTE_BASE_URL') or 'http://127.0.0.1:20128/v1'
