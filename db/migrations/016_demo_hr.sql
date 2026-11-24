-- S3-DBA-05: demo data for the HR screens (departments, jobs, employees, job history).
-- Demo rows are easy to spot: employees DE001-DE010, departments DX1-DX2, jobs DJ01-DJ03.
-- They cover: an employee with three career steps, a promotion dated in the future (not
-- yet in effect), a separated employee, an employee with no department, a brand-new hire,
-- and one deleted employee to demo Restore. Salaries are made-up demo figures.

SELECT set_audit_user('demo-seed');     -- stamp and audit trail show who loaded this

INSERT INTO department (deptcode, deptname) VALUES
  ('DX1', 'Demo Marketing'),
  ('DX2', 'Demo Logistics')
ON CONFLICT (deptcode) DO NOTHING;

INSERT INTO job (jobcode, jobdesc) VALUES
  ('DJ01', 'Demo Analyst'),
  ('DJ02', 'Demo Team Lead'),
  ('DJ03', 'Demo Manager')
ON CONFLICT (jobcode) DO NOTHING;

INSERT INTO employee (empno, lastname, firstname, gender, birthdate, hiredate, sepdate) VALUES
  ('DE001', 'Santos',    'Maria',    'F', '1994-03-12', '2023-01-16', NULL),
  ('DE002', 'Reyes',     'Jose',     'M', '1991-07-25', '2023-03-01', NULL),
  ('DE003', 'Cruz',      'Angela',   'F', '1996-11-02', '2024-05-06', NULL),
  ('DE004', 'Garcia',    'Miguel',   'M', '1989-01-30', '2022-08-01', '2025-12-31'),
  ('DE005', 'Mendoza',   'Patricia', 'F', '1999-09-09', '2025-01-06', NULL),
  ('DE006', 'Torres',    'Ramon',    'M', '1987-05-17', '2021-06-01', NULL),
  ('DE007', 'Villanueva','Carla',    'F', '1990-12-04', '2020-02-03', NULL),
  ('DE008', 'Bautista',  'Luis',     'M', '1993-08-21', '2024-10-01', NULL),
  ('DE009', 'Aquino',    'Nina',     'F', '2000-02-14', '2026-11-01', NULL),
  ('DE010', 'Ramos',     'Paolo',    'M', '1992-06-06', '2022-01-10', NULL)
ON CONFLICT (empno) DO NOTHING;

INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES
  ('DE001', 'DJ01', '2023-01-16', 25000, 'DX1'),
  ('DE001', 'DJ02', '2024-02-01', 32000, 'DX1'),
  ('DE001', 'DJ03', '2025-07-01', 45000, 'DX2'),
  ('DE002', 'DJ01', '2023-03-01', 24000, 'DX2'),
  ('DE002', 'DJ02', '2025-01-01', 30000, 'DX2'),
  ('DE003', 'DJ01', '2024-05-06', 26000, 'DX1'),
  ('DE003', 'DJ02', '2030-01-01', 33000, 'DX1'),     -- future promotion, not in effect yet
  ('DE004', 'DJ01', '2022-08-01', 22000, 'DX1'),
  ('DE004', 'DJ02', '2023-08-01', 29000, 'DX1'),
  ('DE005', 'DJ01', '2025-01-06', 21000, NULL),      -- no department
  ('DE006', 'CLK1', '2021-06-01', 20000, 'ACT'),
  ('DE006', 'CLK2', '2022-06-01', 23000, 'ACT'),
  ('DE007', 'SA1',  '2020-02-03', 28000, 'BR1'),
  ('DE007', 'SA2',  '2021-02-03', 32000, 'BR1'),
  ('DE007', 'SPVR', '2023-02-03', 40000, 'BR1'),
  ('DE008', 'PR1',  '2024-10-01', 40000, 'IT'),
  ('DE009', 'DJ01', '2026-11-01', 23000, 'DX2')
ON CONFLICT DO NOTHING;

-- Deleted example for the Restore demo (an employee with no job history)
UPDATE employee SET is_deleted = true WHERE empno = 'DE010';
