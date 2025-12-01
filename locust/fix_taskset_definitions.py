#!/usr/bin/env python3
"""
Fix TaskSet classes in all load test files to use explicit task dictionaries.
This ensures Locust properly recognizes all @task decorated methods.
"""

import re
import os

def fix_taskset_file(filepath):
    """Fix a single load test file"""
    print(f"\nProcessing: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # For each TaskSet class, we need to:
    # 1. Add `tasks = {}` to the class definition
    # 2. Add explicit tasks dictionary after the class definition

    # Pattern to find TaskSet classes
    patterns = [
        ('NewUserJourney', [
            'browse_popular_itineraries: 3',
            'search_destinations: 2',
            'view_itinerary_details: 2',
            'create_first_itinerary: 1',
            'view_and_comment: 1',
        ]),
        ('ActiveUserJourney', [
            'browse_and_engage: 4',
            'view_itineraries: 3',
            'create_new_itinerary: 2',
            'browse_and_comment: 3',
        ]),
        ('CasualBrowserJourney', [
            'quick_browse: 5',
            'search_destinations: 3',
            'view_popular_itineraries: 2',
            'maybe_register: 1',
        ]),
    ]

    for class_name, task_methods in patterns:
        # Check if already has explicit tasks
        if f'{class_name}.tasks = {{' in content:
            print(f"  [SKIP] {class_name}: Already has explicit tasks")
            continue

        # Find class definition
        class_pattern = f'class {class_name}\\(TaskSet\\):'
        if class_pattern not in content:
            print(f"  [NOT FOUND] {class_name}")
            continue

        # Add `tasks = {}` to class definition if not present
        old_class_def = f'class {class_name}(TaskSet):\n    """\n'
        new_class_def = f'class {class_name}(TaskSet):\n    tasks = {{}}\n    """\n'

        if 'tasks = {}' not in content.split(f'class {class_name}')[1].split('\n')[1]:
            content = content.replace(old_class_def, new_class_def)
            print(f"  [ADDED] {class_name}: tasks = {{}}")

        # Find where to add the explicit tasks dictionary
        # Look for the next comment line after the class definition
        next_comment = f'# ' in content.split(f'class {class_name}')[1]

        # Build the tasks dictionary string
        tasks_dict = f'{class_name}.tasks = {{\n'
        for task_method in task_methods:
            # Extract method name and weight
            method_name, weight = task_method.split(': ')
            tasks_dict += f'    {class_name}.{method_name}: {weight},\n'
        tasks_dict += '}\n\n'

        # Find insertion point (after the class ends, before next major comment)
        # Look for pattern: closing of previous class, then # ====
        search_pattern = f'# ====' in content.split(f'class {class_name}')[1]
        if search_pattern:
            # Find the exact position
            class_section = content.split(f'class {class_name}', 1)[1]
            # Find the first comment line that starts with # ====
            lines = class_section.split('\n')
            insert_line = 0
            for i, line in enumerate(lines):
                if line.startswith('# '):
                    insert_line = i
                    break

            if insert_line > 0:
                # Reconstruct the content with the tasks dictionary
                before_class = content.split(f'class {class_name}')[0]
                after_insert = '\n'.join(lines[insert_line:])
                middle_class = '\n'.join(lines[:insert_line])

                # Insert the tasks dictionary
                new_content = f"{before_class}class {class_name}(TaskSet):{middle_class}\n\n{tasks_dict}{after_insert}"

                # Only update if it worked
                if tasks_dict in new_content:
                    content = new_content
                    print(f"  [ADDED] {class_name}: Explicit tasks dictionary")

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  [SUCCESS] Fixed: {filepath}")
    return True

# Fix all load test files
files_to_fix = [
    'locust/locustfile_scenario_a.py',
    'locust/locustfile_scenario_b.py',
    'locust/locustfile_scenario_lifetime.py',
    'locust/locustfile_microservices.py',
]

print("="*70)
print("FIXING TASKSET DEFINITIONS IN ALL LOAD TEST FILES")
print("="*70)

for filepath in files_to_fix:
    if os.path.exists(filepath):
        try:
            fix_taskset_file(filepath)
        except Exception as e:
            print(f"  [ERROR] {filepath}: {str(e)}")
    else:
        print(f"  [NOT FOUND] {filepath}")

print("\n" + "="*70)
print("DONE!")
print("="*70)
