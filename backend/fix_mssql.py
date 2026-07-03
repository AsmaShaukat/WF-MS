import pathlib

f = pathlib.Path(r'C:\Users\Asma Shaukat\AppData\Local\Programs\Python\Python313\Lib\site-packages\mssql\base.py')
txt = f.read_text(encoding='utf-8')

old = '''        if self.alias not in _known_versions:
            with self.temporary_connection() as cursor:
                cursor.execute("SELECT CAST(SERVERPROPERTY('ProductVersion') AS varchar)")
                ver = cursor.fetchone()[0]
                ver = int(ver.split('.')[0])
                if ver not in self._sql_server_versions:
                    # raise NotSupportedError('SQL Server v%d is not supported.' % ver)
                    pass
                ver = ver if ver in self._sql_server_versions else max(self._sql_server_versions.keys())
        _known_versions[self.alias] = self._sql_server_versions[ver]
        return _known_versions[self.alias]'''

new = '''        if self.alias not in _known_versions:
            with self.temporary_connection() as cursor:
                cursor.execute("SELECT CAST(SERVERPROPERTY('ProductVersion') AS varchar)")
                ver = cursor.fetchone()[0]
                ver = int(ver.split('.')[0])
                if ver not in self._sql_server_versions:
                    ver = max(self._sql_server_versions.keys())
                _known_versions[self.alias] = self._sql_server_versions[ver]
        return _known_versions[self.alias]'''

if old in txt:
    txt = txt.replace(old, new)
    f.write_text(txt, encoding='utf-8')
    print('SUCCESS!')
else:
    print('Pattern not found!')