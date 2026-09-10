#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os, sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cloudrun.settings_scf")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
