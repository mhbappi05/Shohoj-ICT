// Example programs for the C visualizer.
export const PRESETS = [
    { id: 'hello', code: `#include <stdio.h>
  
  int main() {
      printf("Hello, HSC ICT!\\n");
      return 0;
  }
  ` },
    { id: 'sum2', code: `#include <stdio.h>
  
  int main() {
      int a, b, sum;
      printf("Enter two numbers: ");
      scanf("%d %d", &a, &b);
      sum = a + b;
      printf("Sum = %d\\n", sum);
      return 0;
  }
  ` },
    { id: 'evenodd', code: `#include <stdio.h>
  
  int main() {
      int n;
      printf("Enter a number: ");
      scanf("%d", &n);
      if (n % 2 == 0) {
          printf("%d is even\\n", n);
      } else {
          printf("%d is odd\\n", n);
      }
      return 0;
  }
  ` },
    { id: 'grade', code: `#include <stdio.h>
  
  int main() {
      int marks;
      printf("Enter marks: ");
      scanf("%d", &marks);
      if (marks >= 80) {
          printf("Grade A+\\n");
      } else if (marks >= 70) {
          printf("Grade A\\n");
      } else if (marks >= 60) {
          printf("Grade A-\\n");
      } else if (marks >= 33) {
          printf("Pass\\n");
      } else {
          printf("Fail\\n");
      }
      return 0;
  }
  ` },
    { id: 'factorial', code: `#include <stdio.h>
  
  int main() {
      int n, i;
      long long fact = 1;
      printf("Enter n: ");
      scanf("%d", &n);
      for (i = 1; i <= n; i++) {
          fact = fact * i;
      }
      printf("%d! = %lld\\n", n, fact);
      return 0;
  }
  ` },
    { id: 'table', code: `#include <stdio.h>
  
  int main() {
      int n, i = 1;
      printf("Table of: ");
      scanf("%d", &n);
      while (i <= 10) {
          printf("%d x %d = %d\\n", n, i, n * i);
          i++;
      }
      return 0;
  }
  ` },
    { id: 'arraymax', code: `#include <stdio.h>
  
  int main() {
      int a[5] = {12, 45, 7, 30, 18};
      int i, max;
      max = a[0];
      for (i = 1; i < 5; i++) {
          if (a[i] > max) {
              max = a[i];
          }
      }
      printf("Largest = %d\\n", max);
      return 0;
  }
  ` },
    { id: 'fibonacci', code: `#include <stdio.h>
  
  int main() {
      int n, i, a = 0, b = 1, next;
      printf("How many terms? ");
      scanf("%d", &n);
      for (i = 1; i <= n; i++) {
          printf("%d ", a);
          next = a + b;
          a = b;
          b = next;
      }
      printf("\\n");
      return 0;
  }
  ` },
    { id: 'prime', code: `#include <stdio.h>
  
  int main() {
      int n, i, isPrime = 1;
      printf("Enter a number: ");
      scanf("%d", &n);
      if (n < 2) {
          isPrime = 0;
      }
      for (i = 2; i * i <= n; i++) {
          if (n % i == 0) {
              isPrime = 0;
              break;
          }
      }
      if (isPrime) {
          printf("%d is prime\\n", n);
      } else {
          printf("%d is not prime\\n", n);
      }
      return 0;
  }
  ` },
    { id: 'calc', code: `#include <stdio.h>
  
  int main() {
      int a, b;
      char op;
      printf("Enter like 12 * 4: ");
      scanf("%d %c %d", &a, &op, &b);
      switch (op) {
          case '+': printf("%d\\n", a + b); break;
          case '-': printf("%d\\n", a - b); break;
          case '*': printf("%d\\n", a * b); break;
          case '/': printf("%d\\n", a / b); break;
          default: printf("Unknown operator\\n");
      }
      return 0;
  }
  ` },
  ];