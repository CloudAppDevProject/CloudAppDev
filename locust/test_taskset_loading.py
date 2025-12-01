"""
Diagnostic test to verify TaskSet task dictionary loading in Locust
This script checks if Locust properly recognizes explicit task dictionaries
"""

from locust import TaskSet, HttpUser, between

class TestTaskSet(TaskSet):
    """Test TaskSet with explicit task dictionary"""

    def task_one(self):
        """First task"""
        print("[TEST] task_one called")

    def task_two(self):
        """Second task"""
        print("[TEST] task_two called")

    def task_three(self):
        """Third task"""
        print("[TEST] task_three called")

# Method 1: Explicit dictionary assignment (what we're using)
TestTaskSet.tasks = {
    TestTaskSet.task_one: 1,
    TestTaskSet.task_two: 1,
    TestTaskSet.task_three: 1,
}

print("=" * 70)
print("TASKSET LOADING DIAGNOSTIC")
print("=" * 70)
print()

# Check if tasks were set
print(f"TestTaskSet.tasks exists: {hasattr(TestTaskSet, 'tasks')}")
print(f"TestTaskSet.tasks type: {type(TestTaskSet.tasks)}")
print(f"TestTaskSet.tasks value: {TestTaskSet.tasks}")
print()

# Check task names
if hasattr(TestTaskSet, 'tasks') and isinstance(TestTaskSet.tasks, dict):
    print(f"Number of tasks: {len(TestTaskSet.tasks)}")
    print("Task methods:")
    for task_method, weight in TestTaskSet.tasks.items():
        print(f"  - {task_method.__name__} (weight={weight})")
    print()

print("TaskSet loaded successfully if you see task methods above.")
print()

# Try to instantiate and verify
class TestUser(HttpUser):
    wait_time = between(1, 1)
    tasks = [TestTaskSet]

print("Test setup complete. TaskSet is ready for Locust.")
print()
print("If running with Locust:")
print("  locust -f locust/test_taskset_loading.py --host=http://localhost:3000 -u 1 -r 1")
print()
print("Expected output during test run:")
print("  [TEST] task_one called")
print("  [TEST] task_two called")
print("  [TEST] task_three called")
print()
print("If you DON'T see [TEST] messages, the explicit task dictionary is NOT working.")
