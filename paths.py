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


def omniroute_env_path():
    return os.path.join(OMNIROUTE_HOME, '.env')


# The local OpenAI-compatible proxy. Overridable so a checkout carries no
# machine-specific port either.
OMNI_BASE = os.environ.get('OMNIROUTE_BASE_URL') or 'http://127.0.0.1:20128/v1'
