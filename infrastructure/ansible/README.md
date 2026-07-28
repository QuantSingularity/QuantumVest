# QuantumVest Ansible Configuration

## Overview

Ansible playbooks and roles for configuring QuantumVest infrastructure servers.

## Prerequisites

### Required Tools

```bash
# Ansible 2.15+
ansible --version

# Python 3.8+
python3 --version

# ansible-lint (optional)
ansible-lint --version

# yamllint (optional)
yamllint --version
```

### SSH Access

```bash
# Ensure SSH key is available
ls -la ~/.ssh/quantumvest-key.pem

# Set correct permissions
chmod 600 ~/.ssh/quantumvest-key.pem

# Test SSH connectivity
ssh -i ~/.ssh/quantumvest-key.pem ec2-user@<server-ip>
```

## Quick Start

### 1. Configure Inventory

```bash
# Copy example inventory
cp inventory/hosts.example.yml inventory/hosts.yml

# Edit with your server IPs
vi inventory/hosts.yml

# Test connectivity
ansible all -m ping -i inventory/hosts.yml
```

### 2. Install Ansible Collections

```bash
# Installs community.general, community.mysql, and ansible.posix —
# see requirements.yml for exact version constraints.
ansible-galaxy collection install -r requirements.yml
```

### 3. Validate Configuration

```bash
# Lint playbooks
ansible-lint playbooks/

# Validate YAML
yamllint .

# Check syntax
ansible-playbook playbooks/main.yml --syntax-check
```

### 4. Run Playbooks

```bash
# Dry run (check mode)
ansible-playbook playbooks/main.yml --check

# Run with verbose output
ansible-playbook playbooks/main.yml -v

# Run specific tags
ansible-playbook playbooks/main.yml --tags "webserver"

# Run on specific hosts
ansible-playbook playbooks/main.yml --limit webservers
```

## Directory Structure

```
ansible/
├── ansible.cfg                 # Ansible configuration
├── .ansible-lint              # Linting rules
├── README.md                  # This file
├── inventory/                 # Inventory files
│   ├── hosts.yml             # Main inventory (configure)
│   └── hosts.example.yml     # Example inventory
├── playbooks/                # Playbooks
│   └── main.yml              # Main playbook
├── roles/                    # Ansible roles
│   ├── common/               # Common configuration
│   │   └── tasks/
│   │       └── main.yml
│   ├── database/             # Database setup
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   ├── templates/
│   │   │   └── my.cnf.j2
│   │   └── vars/
│   │       └── main.yml
│   └── webserver/            # Web server setup
│       ├── handlers/
│       │   └── main.yml
│       ├── tasks/
│       │   └── main.yml
│       ├── templates/
│       │   └── nginx.conf.j2
│       └── vars/
│           └── main.yml
└── group_vars/               # Group variables (create as needed)
    ├── all.yml
    ├── webservers.yml
    └── databases.yml
```

## Playbooks

### Main Playbook

```bash
# Run all roles on all servers
ansible-playbook playbooks/main.yml

# Check what would change (dry-run)
ansible-playbook playbooks/main.yml --check --diff
```

### Role-Specific Execution

```bash
# Only run common role
ansible-playbook playbooks/main.yml --tags common

# Only run webserver configuration
ansible-playbook playbooks/main.yml --tags webserver

# Only run database configuration
ansible-playbook playbooks/main.yml --tags database
```

## Roles

### Common Role

Configures basic system settings for all servers:

- System updates
- Essential packages
- Security hardening
- User management
- NTP configuration

```bash
# Run common role
ansible-playbook playbooks/main.yml --tags common
```

### Webserver Role

Configures Nginx web servers:

- Nginx installation
- SSL/TLS configuration
- Virtual hosts
- Firewall rules
- Log rotation

```bash
# Run webserver role on webservers group
ansible-playbook playbooks/main.yml --limit webservers --tags webserver
```

### Database Role

Configures MySQL database servers:

- MySQL installation
- Database creation
- User management
- Backup configuration
- Performance tuning

```bash
# Run database role on databases group
ansible-playbook playbooks/main.yml --limit databases --tags database
```

## Variables

### Group Variables

`group_vars/all/vars.yml` (already created — applies to all hosts; this is
where `app_name`, `server_name`, `db_name`, and `db_user` are defined, since
`webserver` and `database` role tasks/templates reference them directly):

```yaml
---
app_name: quantumvest
server_name: _ # nginx catch-all; override with your real domain
db_name: quantumvestdb
db_user: appuser
db_root_password: "{{ vault_mysql_root_password }}"
db_password: "{{ vault_db_password }}"
```

For group-specific overrides, add `group_vars/webservers.yml` /
`group_vars/databases.yml` alongside it.

### Host Variables

Create `host_vars/` directory for host-specific overrides:

**host_vars/web1.yml**:

```yaml
---
nginx_worker_processes: 4
```

### Vault for Secrets

`group_vars/all/vars.yml` references `vault_mysql_root_password` and
`vault_db_password`, which come from an ansible-vault-encrypted file in the
same directory — copy the example and encrypt it:

```bash
cp group_vars/all/vault.yml.example group_vars/all/vault.yml
ansible-vault encrypt group_vars/all/vault.yml

# Edit later
ansible-vault edit group_vars/all/vault.yml

# Run playbook with vault
ansible-playbook playbooks/main.yml --ask-vault-pass

# Or use vault password file
ansible-playbook playbooks/main.yml --vault-password-file ~/.vault_pass
```

## Ad-Hoc Commands

### System Information

```bash
# Check all hosts are reachable
ansible all -m ping

# Get facts from all hosts
ansible all -m setup

# Check disk space
ansible all -m shell -a "df -h"

# Check memory
ansible all -m shell -a "free -h"

# Check uptime
ansible all -m command -a "uptime"
```

### Package Management

```bash
# Update all packages
ansible all -m yum -a "name=* state=latest" --become

# Install specific package
ansible webservers -m yum -a "name=nginx state=present" --become

# Restart service
ansible webservers -m service -a "name=nginx state=restarted" --become
```

### File Operations

```bash
# Copy file to servers
ansible webservers -m copy -a "src=./config.conf dest=/etc/app/config.conf" --become

# Create directory
ansible all -m file -a "path=/opt/app state=directory mode=0755" --become

# Check if file exists
ansible all -m stat -a "path=/etc/app/config.conf"
```

### User Management

```bash
# Create user
ansible all -m user -a "name=appuser state=present" --become

# Add SSH key
ansible all -m authorized_key -a "user=appuser key='{{ lookup('file', '~/.ssh/id_rsa.pub') }}'" --become
```

## Testing

### Syntax Check

```bash
# Check playbook syntax
ansible-playbook playbooks/main.yml --syntax-check

# Check specific role
ansible-playbook playbooks/main.yml --syntax-check --tags webserver
```

### Dry Run

```bash
# Check mode (don't make changes)
ansible-playbook playbooks/main.yml --check

# Check mode with diff
ansible-playbook playbooks/main.yml --check --diff
```

### Linting

```bash
# Lint all playbooks
ansible-lint playbooks/

# Lint specific file
ansible-lint roles/webserver/tasks/main.yml

# Lint with specific rules
ansible-lint -p playbooks/main.yml
```

### YAML Validation

```bash
# Lint YAML files
yamllint .

# Lint specific directory
yamllint playbooks/

# Custom config
yamllint -c .yamllint playbooks/
```

## Troubleshooting

### Connection Issues

```bash
# Increase verbosity
ansible-playbook playbooks/main.yml -vvv

# Test specific host
ansible web1 -m ping -vvv

# Check SSH config
ansible all -m shell -a "echo \$SSH_CONNECTION" -vvv
```

### Permission Issues

```bash
# Verify become works
ansible all -m shell -a "whoami" --become

# Check sudo access
ansible all -m shell -a "sudo -l"
```

### Debugging

```bash
# Debug variables
ansible all -m debug -a "var=hostvars[inventory_hostname]"

# Show gathered facts
ansible all -m setup | grep ansible_distribution

# List tags
ansible-playbook playbooks/main.yml --list-tags

# List tasks
ansible-playbook playbooks/main.yml --list-tasks

# Start at specific task
ansible-playbook playbooks/main.yml --start-at-task="Install nginx"
```

## Best Practices

### Idempotency

- Use Ansible modules (not shell/command when possible)
- Test playbooks multiple times to ensure idempotency
- Use `changed_when` to control change reporting

### Security

- Use `ansible-vault` for sensitive data
- Never commit plaintext passwords
- Use `no_log: true` for tasks handling secrets
- Limit SSH key permissions: `chmod 600`

### Performance

- Use `strategy: free` for independent tasks
- Enable pipelining in ansible.cfg
- Use `async` for long-running tasks
- Cache facts with `fact_caching`

### Organization

- Use roles for reusable code
- Keep playbooks simple, logic in roles
- Use `group_vars` and `host_vars` for configuration
- Tag tasks for selective execution

### Version Control

- Commit playbooks and roles
- Use `.gitignore` for:
  - `*.retry`
  - `hosts.yml` (use hosts.example.yml as template)
  - `group_vars/*/vault.yml` (encrypted files are OK)
  - `.vault_pass`

## Common Tasks

### Deploy Application

```bash
# Update application code
ansible webservers -m git -a "repo=https://github.com/org/app.git dest=/opt/app version=main" --become

# Restart application
ansible webservers -m systemd -a "name=app state=restarted" --become
```

### Database Backup

```bash
# Backup database
ansible databases -m shell -a "mysqldump -u root -p'{{ mysql_root_password }}' quantumvest > /backup/db-$(date +%Y%m%d).sql" --become

# Download backup
ansible databases -m fetch -a "src=/backup/db-20240101.sql dest=./backups/ flat=yes"
```

### Log Collection

```bash
# Collect logs
ansible all -m fetch -a "src=/var/log/app/app.log dest=./logs/{{ inventory_hostname }}/ flat=no"

# Clear old logs
ansible all -m shell -a "find /var/log/app -name '*.log' -mtime +30 -delete" --become
```

## Maintenance

### Update Playbooks

1. Edit playbooks/roles
2. Test with `--check`
3. Run on development servers first
4. Roll out to production

### Update Inventory

1. Update hosts.yml with new servers
2. Test connectivity: `ansible new_host -m ping`
3. Run initial configuration

### Security Updates

```bash
# Update all packages
ansible all -m yum -a "name=* state=latest" --become

# Reboot if needed
ansible all -m reboot -a "msg='Security updates' test_command='uptime'" --become
```

## CI/CD Integration

### GitLab CI

```yaml
ansible-deploy:
  stage: deploy
  script:
    - ansible-playbook playbooks/main.yml --vault-password-file $VAULT_PASS
  only:
    - main
```

### GitHub Actions

```yaml
- name: Run Ansible
  uses: dawidd6/action-ansible-playbook@v2
  with:
    playbook: playbooks/main.yml
    directory: ./ansible
    key: ${{secrets.SSH_PRIVATE_KEY}}
    vault_password: ${{secrets.VAULT_PASSWORD}}
```
