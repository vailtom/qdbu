// GERADO por app/devtools/catalogo.mjs -- nao edite a mao.
// Fonte: harbour/core@c1941b599466 + catalogo.manual.json
// Regenerar: node app/devtools/catalogo.mjs
//
// Uma entrada por funcao que o construtor de expressao OFERECE. `args[].t` e
// `ret` sao letras de tipo (C N D L M A B) ou "any"; `opc` marca opcional;
// `one` e a descricao em ingles da fonte, usada quando nao ha UI_FN_<NOME>_DESC.
// Rotulo, descricao e palavras-chave traduzidos moram nos dicionarios de i18n.
(function () {
  window.CATALOGO = {
    "versao": 1,
    "fonte": "harbour/core@c1941b599466",
    "funcoes": {
      "ABS": {
        "nome": "Abs",
        "ret": "N",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Return the absolute value of a number."
      },
      "ACLONE": {
        "nome": "AClone",
        "ret": "A",
        "cat": "VETOR",
        "src": "core",
        "args": [
          {
            "n": "aSource",
            "t": "A",
            "opc": false
          }
        ],
        "one": "Duplicate a multidimensional array"
      },
      "ACOPY": {
        "nome": "ACopy",
        "ret": "A",
        "cat": "VETOR",
        "src": "core",
        "args": [
          {
            "n": "aSource",
            "t": "A",
            "opc": false
          },
          {
            "n": "aTarget",
            "t": "A",
            "opc": false
          },
          {
            "n": "nStart",
            "t": "N",
            "opc": true
          },
          {
            "n": "nCount",
            "t": "N",
            "opc": true
          },
          {
            "n": "nTargetPos",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Copy elements from one array to another"
      },
      "AEVAL": {
        "nome": "AEval",
        "ret": "A",
        "cat": "VETOR",
        "src": "core",
        "args": [
          {
            "n": "aArray",
            "t": "A",
            "opc": false
          },
          {
            "n": "bBlock",
            "t": "B",
            "opc": false
          },
          {
            "n": "nStart",
            "t": "N",
            "opc": true
          },
          {
            "n": "nCount",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Evaluates the subscript element of an array"
      },
      "ALIAS": {
        "nome": "Alias",
        "ret": "C",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "nWorkArea",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Returns the alias name of a work area"
      },
      "ALLTRIM": {
        "nome": "AllTrim",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Removes leading and trailing blank spaces from a string"
      },
      "ARRAY": {
        "nome": "Array",
        "ret": "A",
        "cat": "VETOR",
        "src": "core",
        "args": [
          {
            "n": "nElements",
            "t": "N",
            "opc": false
          },
          {
            "n": "nElements",
            "t": "N",
            "opc": true,
            "rest": true
          }
        ],
        "one": "Create an uninitialized array of specified length"
      },
      "ASC": {
        "nome": "Asc",
        "ret": "N",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cCharacter",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Returns the ASCII value of a character"
      },
      "ASCAN": {
        "nome": "AScan",
        "ret": "N",
        "cat": "VETOR",
        "src": "core",
        "args": [
          {
            "n": "aArray",
            "t": "A",
            "opc": false
          },
          {
            "n": "xSearch",
            "t": "any",
            "opc": false
          },
          {
            "n": "nStart",
            "t": "N",
            "opc": true
          },
          {
            "n": "nCount",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Scan array elements for a specified condition"
      },
      "ASORT": {
        "nome": "ASort",
        "ret": "A",
        "cat": "VETOR",
        "src": "core",
        "args": [
          {
            "n": "aArray",
            "t": "A",
            "opc": false
          },
          {
            "n": "nStart",
            "t": "N",
            "opc": true
          },
          {
            "n": "nCount",
            "t": "N",
            "opc": true
          },
          {
            "n": "bSort",
            "t": "B",
            "opc": true
          }
        ],
        "one": "Sort an array"
      },
      "AT": {
        "nome": "At",
        "ret": "N",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cSearch",
            "t": "C",
            "opc": false
          },
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Locates the position of a substring in a main string."
      },
      "ATAIL": {
        "nome": "ATail",
        "ret": "any",
        "cat": "VETOR",
        "src": "core",
        "args": [
          {
            "n": "aArray",
            "t": "A",
            "opc": false
          }
        ],
        "one": "Returns the last element of an array"
      },
      "ATNUM": {
        "nome": "AtNum",
        "ret": "N",
        "cat": "TEXTO",
        "src": "hbct",
        "args": [
          {
            "n": "cStringToMatch",
            "t": "C",
            "opc": false
          },
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "nCounter",
            "t": "N",
            "opc": true
          },
          {
            "n": "nIgnore",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Returns the start position of the nth occurence of a substring in a string"
      },
      "BIN2I": {
        "nome": "Bin2I",
        "ret": "N",
        "cat": "CONVERSAO",
        "src": "core",
        "args": [
          {
            "n": "cBuffer",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Convert signed short encoded bytes into Harbour numeric"
      },
      "BIN2L": {
        "nome": "Bin2L",
        "ret": "N",
        "cat": "CONVERSAO",
        "src": "core",
        "args": [
          {
            "n": "cBuffer",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Convert signed long encoded bytes into Harbour numeric"
      },
      "BIN2W": {
        "nome": "Bin2W",
        "ret": "N",
        "cat": "CONVERSAO",
        "src": "core",
        "args": [
          {
            "n": "cBuffer",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Convert unsigned short encoded bytes into Harbour numeric"
      },
      "BOF": {
        "nome": "Bof",
        "ret": "L",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Test for the beginning-of-file condition"
      },
      "CDOW": {
        "nome": "CDoW",
        "ret": "C",
        "cat": "DATA",
        "src": "core",
        "args": [
          {
            "n": "dDate",
            "t": "D",
            "opc": false
          }
        ],
        "one": "Converts a date to the day of week"
      },
      "CHR": {
        "nome": "Chr",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "nAsciiNum",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Converts an ASCII value to it character value"
      },
      "CMONTH": {
        "nome": "CMonth",
        "ret": "C",
        "cat": "DATA",
        "src": "core",
        "args": [
          {
            "n": "dDate",
            "t": "D",
            "opc": false
          }
        ],
        "one": "Return the name of the month."
      },
      "CTOD": {
        "nome": "CToD",
        "ret": "D",
        "cat": "DATA",
        "src": "core",
        "args": [
          {
            "n": "cDateString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Converts a character string to a date expression"
      },
      "CURDIR": {
        "nome": "CurDir",
        "ret": "C",
        "cat": "AMBIENTE",
        "src": "core",
        "args": [
          {
            "n": "cDrive",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Returns the current OS directory name."
      },
      "DATE": {
        "nome": "Date",
        "ret": "D",
        "cat": "DATA",
        "src": "core",
        "args": [],
        "one": "Return the Current OS Date"
      },
      "DAY": {
        "nome": "Day",
        "ret": "N",
        "cat": "DATA",
        "src": "core",
        "args": [
          {
            "n": "cDate",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Return the numeric day of the month."
      },
      "DBFILTER": {
        "nome": "dbFilter",
        "ret": "C",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Return the filter expression in a work area"
      },
      "DBRELATION": {
        "nome": "dbRelation",
        "ret": "C",
        "cat": "BANCO",
        "src": "manual",
        "args": [
          {
            "n": "nRelation",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Return the linking expression of a specified relation"
      },
      "DBRSELECT": {
        "nome": "dbRSelect",
        "ret": "N",
        "cat": "BANCO",
        "src": "manual",
        "args": [
          {
            "n": "nRelation",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Return the target work area number of a relation"
      },
      "DELETED": {
        "nome": "Deleted",
        "ret": "L",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Tests the record's deletion flag."
      },
      "DESCEND": {
        "nome": "Descend",
        "ret": "any",
        "cat": "CONVERSAO",
        "src": "core",
        "args": [
          {
            "n": "xExp",
            "t": "any",
            "opc": false
          }
        ],
        "one": "Inverts an expression of string, logical, date or numeric type."
      },
      "DIRECTORY": {
        "nome": "Directory",
        "ret": "A",
        "cat": "AMBIENTE",
        "src": "manual",
        "args": [
          {
            "n": "cDirSpec",
            "t": "C",
            "opc": false
          },
          {
            "n": "cAttributes",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Create an array of directory and file information"
      },
      "DOW": {
        "nome": "DoW",
        "ret": "N",
        "cat": "DATA",
        "src": "core",
        "args": [
          {
            "n": "dDate",
            "t": "D",
            "opc": false
          }
        ],
        "one": "Value for the day of week."
      },
      "DTOC": {
        "nome": "DToC",
        "ret": "C",
        "cat": "DATA",
        "src": "core",
        "args": [
          {
            "n": "dDateString",
            "t": "D",
            "opc": false
          }
        ],
        "one": "Date to character conversion"
      },
      "DTOS": {
        "nome": "DToS",
        "ret": "C",
        "cat": "DATA",
        "src": "core",
        "args": [
          {
            "n": "dDateString",
            "t": "D",
            "opc": false
          }
        ],
        "one": "Date to string conversion"
      },
      "EMPTY": {
        "nome": "Empty",
        "ret": "L",
        "cat": "GERAL",
        "src": "core",
        "args": [
          {
            "n": "xExp",
            "t": "any",
            "opc": false
          }
        ],
        "one": "Checks if the passed argument is empty."
      },
      "EOF": {
        "nome": "Eof",
        "ret": "L",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Test for end-of-file condition."
      },
      "EVAL": {
        "nome": "Eval",
        "ret": "any",
        "cat": "GERAL",
        "src": "core",
        "args": [
          {
            "n": "bBlock",
            "t": "B",
            "opc": false
          },
          {
            "n": "xVal",
            "t": "any",
            "opc": true,
            "rest": true
          }
        ],
        "one": "Evaluate a code block"
      },
      "EXP": {
        "nome": "Exp",
        "ret": "N",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Calculates the value of e raised to the passed power."
      },
      "FCOUNT": {
        "nome": "FCount",
        "ret": "N",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Counts the number of fields in an active database."
      },
      "FIELDBLOCK": {
        "nome": "FieldBlock",
        "ret": "B",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "cFieldName",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Return a code block that sets/gets a value for a given field"
      },
      "FIELDGET": {
        "nome": "FieldGet",
        "ret": "any",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "nField",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Obtains the value of a specified field"
      },
      "FIELDNAME": {
        "nome": "FieldName",
        "ret": "C",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "nPosition",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Return the name of a field at a numeric field location."
      },
      "FIELDPOS": {
        "nome": "FieldPos",
        "ret": "N",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "cFieldName",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Return the ordinal position of a field."
      },
      "FIELDWBLOCK": {
        "nome": "FieldWBlock",
        "ret": "B",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "cFieldName",
            "t": "C",
            "opc": false
          },
          {
            "n": "nWorkArea",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Return a sets/gets code block for field in a given work area"
      },
      "FILE": {
        "nome": "File",
        "ret": "L",
        "cat": "AMBIENTE",
        "src": "core",
        "args": [
          {
            "n": "cFileSpec",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Tests for the existence of file(s)"
      },
      "FOUND": {
        "nome": "Found",
        "ret": "L",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Determine the success of a previous search operation."
      },
      "GETENV": {
        "nome": "GetEnv",
        "ret": "C",
        "cat": "AMBIENTE",
        "src": "core",
        "args": [
          {
            "n": "cEnviroment",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Obtains a system environmental setting."
      },
      "HARDCR": {
        "nome": "HardCR",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Replace all soft carriage returns with hard carriages returns."
      },
      "HEADER": {
        "nome": "Header",
        "ret": "N",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Return the length of a database file header"
      },
      "I2BIN": {
        "nome": "I2Bin",
        "ret": "C",
        "cat": "CONVERSAO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Convert Harbour numeric into signed short encoded bytes"
      },
      "IIF": {
        "nome": "IIf",
        "ret": "any",
        "cat": "GERAL",
        "src": "manual",
        "args": [
          {
            "n": "lCondition",
            "t": "L",
            "opc": false
          },
          {
            "n": "expTrue",
            "t": "any",
            "opc": false
          },
          {
            "n": "expFalse",
            "t": "any",
            "opc": false
          }
        ],
        "one": "Return one of two values depending on a logical condition"
      },
      "INDEXEXT": {
        "nome": "IndexExt",
        "ret": "C",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Returns the file extension of the index module used in an application"
      },
      "INDEXKEY": {
        "nome": "IndexKey",
        "ret": "C",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "nOrder",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Yields the key expression of a specified index file."
      },
      "INDEXORD": {
        "nome": "IndexOrd",
        "ret": "N",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Returns the numeric position of the controlling index."
      },
      "INT": {
        "nome": "Int",
        "ret": "N",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Return the integer port of a numeric value."
      },
      "ISALPHA": {
        "nome": "IsAlpha",
        "ret": "L",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Checks if leftmost character in a string is an alphabetic character"
      },
      "ISDIGIT": {
        "nome": "IsDigit",
        "ret": "L",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Checks if leftmost character is a digit character"
      },
      "ISLOWER": {
        "nome": "IsLower",
        "ret": "L",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Checks if leftmost character is an lowercased letter."
      },
      "ISUPPER": {
        "nome": "IsUpper",
        "ret": "L",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Checks if leftmost character is an uppercased letter."
      },
      "L2BIN": {
        "nome": "L2Bin",
        "ret": "C",
        "cat": "CONVERSAO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Convert Harbour numeric into signed long encoded bytes"
      },
      "LASTREC": {
        "nome": "LastRec",
        "ret": "N",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Returns the number of records in an active work area or database."
      },
      "LEFT": {
        "nome": "Left",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "nLen",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Extract the leftmost substring of a character expression"
      },
      "LEN": {
        "nome": "Len",
        "ret": "N",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "any",
            "opc": false
          }
        ],
        "one": "Returns size of a string or size of an array."
      },
      "LOG": {
        "nome": "Log",
        "ret": "N",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Returns the natural logarithm of a number."
      },
      "LOWER": {
        "nome": "Lower",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Universally lowercases a character string expression."
      },
      "LTRIM": {
        "nome": "LTrim",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Removes leading spaces from a string"
      },
      "LUPDATE": {
        "nome": "LUpdate",
        "ret": "D",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Yields the date the database was last updated."
      },
      "MAX": {
        "nome": "Max",
        "ret": "any",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "xValue",
            "t": "any",
            "opc": false
          },
          {
            "n": "xValue1",
            "t": "any",
            "opc": false
          }
        ],
        "one": "Returns the maximum of two numbers or dates."
      },
      "MEMOLINE": {
        "nome": "MemoLine",
        "ret": "C",
        "cat": "TEXTO",
        "src": "manual",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "nLineLength",
            "t": "N",
            "opc": true
          },
          {
            "n": "nLineNumber",
            "t": "N",
            "opc": true
          },
          {
            "n": "nTabSize",
            "t": "N",
            "opc": true
          },
          {
            "n": "lWrap",
            "t": "L",
            "opc": true
          }
        ],
        "one": "Extract a line of text from a character string or memo field"
      },
      "MEMOREAD": {
        "nome": "MemoRead",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cFileName",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Return the text file's contents as a character string"
      },
      "MEMOTRAN": {
        "nome": "MemoTran",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "cHard",
            "t": "C",
            "opc": true
          },
          {
            "n": "cSoft",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Converts hard and soft carriage returns within strings."
      },
      "MEMVARBLOCK": {
        "nome": "MemVarBlock",
        "ret": "B",
        "cat": "GERAL",
        "src": "core",
        "args": [
          {
            "n": "cMemvarName",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Returns a codeblock that sets/gets a value of memvar variable"
      },
      "MIN": {
        "nome": "Min",
        "ret": "any",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "xValue",
            "t": "any",
            "opc": false
          },
          {
            "n": "xValue1",
            "t": "any",
            "opc": false
          }
        ],
        "one": "Determines the minimum of two numbers or dates."
      },
      "MLCOUNT": {
        "nome": "MLCount",
        "ret": "N",
        "cat": "TEXTO",
        "src": "manual",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "nLineLength",
            "t": "N",
            "opc": true
          },
          {
            "n": "nTabSize",
            "t": "N",
            "opc": true
          },
          {
            "n": "lWrap",
            "t": "L",
            "opc": true
          }
        ],
        "one": "Count the number of lines in a character string or memo field"
      },
      "MOD": {
        "nome": "Mod",
        "ret": "N",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          },
          {
            "n": "nNumber1",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Return the modulus of two numbers."
      },
      "MONTH": {
        "nome": "Month",
        "ret": "N",
        "cat": "DATA",
        "src": "core",
        "args": [
          {
            "n": "dDate",
            "t": "D",
            "opc": false
          }
        ],
        "one": "Converts a date expression to a month value"
      },
      "NETERR": {
        "nome": "NetErr",
        "ret": "L",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "lNewError",
            "t": "L",
            "opc": true
          }
        ],
        "one": "Tests the success of a network function"
      },
      "NUMAT": {
        "nome": "NumAt",
        "ret": "N",
        "cat": "TEXTO",
        "src": "hbct",
        "args": [
          {
            "n": "cStringToMatch",
            "t": "C",
            "opc": false
          },
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "nIgnore",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Number of occurrences of a sequence in a string"
      },
      "ORDBAGEXT": {
        "nome": "ordBagExt",
        "ret": "C",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Returns the Order Bag extension"
      },
      "ORDBAGNAME": {
        "nome": "ordBagName",
        "ret": "C",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "nOrder",
            "t": "any",
            "opc": true
          }
        ],
        "one": "Returns the Order Bag Name."
      },
      "ORDDESCEND": {
        "nome": "ordDescend",
        "ret": "L",
        "cat": "BANCO",
        "src": "manual",
        "args": [
          {
            "n": "cOrder",
            "t": "any",
            "opc": true
          },
          {
            "n": "cIndexFile",
            "t": "C",
            "opc": true
          },
          {
            "n": "lNewDescend",
            "t": "L",
            "opc": true
          }
        ],
        "one": "Return and optionally change the descending flag of an order"
      },
      "ORDFOR": {
        "nome": "ordFor",
        "ret": "C",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "xOrder",
            "t": "any",
            "opc": true
          },
          {
            "n": "cOrderBagName",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Return the FOR expression of an Order"
      },
      "ORDISUNIQUE": {
        "nome": "ordIsUnique",
        "ret": "L",
        "cat": "BANCO",
        "src": "manual",
        "args": [
          {
            "n": "cOrder",
            "t": "any",
            "opc": true
          },
          {
            "n": "cIndexFile",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Return the status of the unique flag for a given order"
      },
      "ORDKEY": {
        "nome": "ordKey",
        "ret": "C",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "cOrderName",
            "t": "any",
            "opc": true
          },
          {
            "n": "cOrderBagName",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Return the key expression of an Order"
      },
      "ORDKEYCOUNT": {
        "nome": "ordKeyCount",
        "ret": "N",
        "cat": "BANCO",
        "src": "manual",
        "args": [
          {
            "n": "cOrder",
            "t": "any",
            "opc": true
          },
          {
            "n": "cIndexFile",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Return the number of keys in an order"
      },
      "ORDKEYNO": {
        "nome": "ordKeyNo",
        "ret": "N",
        "cat": "BANCO",
        "src": "manual",
        "args": [
          {
            "n": "cOrder",
            "t": "any",
            "opc": true
          },
          {
            "n": "cIndexFile",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Return the logical record number of the current key in an order"
      },
      "ORDKEYVAL": {
        "nome": "ordKeyVal",
        "ret": "any",
        "cat": "BANCO",
        "src": "manual",
        "args": [],
        "one": "Return the key value of the current record from the controlling order"
      },
      "ORDNAME": {
        "nome": "ordName",
        "ret": "C",
        "cat": "BANCO",
        "src": "manual",
        "args": [
          {
            "n": "nOrder",
            "t": "N",
            "opc": false
          },
          {
            "n": "cOrderBagName",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Return the name of an order in the order list"
      },
      "ORDNUMBER": {
        "nome": "ordNumber",
        "ret": "N",
        "cat": "BANCO",
        "src": "manual",
        "args": [
          {
            "n": "cOrderName",
            "t": "C",
            "opc": false
          },
          {
            "n": "cOrderBagName",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Return the position of an order in the order list"
      },
      "OS": {
        "nome": "OS",
        "ret": "C",
        "cat": "AMBIENTE",
        "src": "core",
        "args": [],
        "one": "Return the current operating system."
      },
      "PADC": {
        "nome": "PadC",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "xVal",
            "t": "any",
            "opc": false
          },
          {
            "n": "nWidth",
            "t": "N",
            "opc": false
          },
          {
            "n": "cFill",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Centers an expression for a given width"
      },
      "PADL": {
        "nome": "PadL",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "xVal",
            "t": "any",
            "opc": false
          },
          {
            "n": "nWidth",
            "t": "N",
            "opc": false
          },
          {
            "n": "cFill",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Left-justifies an expression for a given width"
      },
      "PADR": {
        "nome": "PadR",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "xVal",
            "t": "any",
            "opc": false
          },
          {
            "n": "nWidth",
            "t": "N",
            "opc": false
          },
          {
            "n": "cFill",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Right-justifies an expression for a given width"
      },
      "PCOUNT": {
        "nome": "PCount",
        "ret": "N",
        "cat": "AMBIENTE",
        "src": "core",
        "args": [],
        "one": "Retrieves the number of arguments passed to a function."
      },
      "PROCLINE": {
        "nome": "ProcLine",
        "ret": "N",
        "cat": "AMBIENTE",
        "src": "core",
        "args": [
          {
            "n": "nLevel",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Gets the line number of the current function on the stack."
      },
      "PROCNAME": {
        "nome": "ProcName",
        "ret": "C",
        "cat": "AMBIENTE",
        "src": "core",
        "args": [
          {
            "n": "nLevel",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Gets the name of the current function on the stack"
      },
      "RAT": {
        "nome": "RAt",
        "ret": "N",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cSearch",
            "t": "C",
            "opc": false
          },
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Searches for last occurrence a substring of a string."
      },
      "RDDNAME": {
        "nome": "rddName",
        "ret": "C",
        "cat": "BANCO",
        "src": "manual",
        "args": [],
        "one": "Return the name of the RDD active in the current work area"
      },
      "RECCOUNT": {
        "nome": "RecCount",
        "ret": "N",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Counts the number of records in a database."
      },
      "RECNO": {
        "nome": "RecNo",
        "ret": "N",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Returns the current record number or identity."
      },
      "RECSIZE": {
        "nome": "RecSize",
        "ret": "N",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Returns the size of a single record in an active database."
      },
      "REPLICATE": {
        "nome": "Replicate",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "nSize",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Repeats a single character expression"
      },
      "RIGHT": {
        "nome": "Right",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "nLen",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Extract the rightmost substring of a character expression"
      },
      "ROUND": {
        "nome": "Round",
        "ret": "N",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          },
          {
            "n": "nPlace",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Rounds off a numeric expression."
      },
      "RTRIM": {
        "nome": "RTrim",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cExpression",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Remove trailing spaces from a string."
      },
      "SECONDS": {
        "nome": "Seconds",
        "ret": "N",
        "cat": "DATA",
        "src": "core",
        "args": [],
        "one": "Returns the number of elapsed seconds past midnight."
      },
      "SELECT": {
        "nome": "Select",
        "ret": "N",
        "cat": "BANCO",
        "src": "core",
        "args": [
          {
            "n": "cAlias",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Returns the work area number for a specified alias."
      },
      "SOUNDEX": {
        "nome": "Soundex",
        "ret": "C",
        "cat": "TEXTO",
        "src": "manual",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Convert a character string to a sound-alike code"
      },
      "SPACE": {
        "nome": "Space",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "nSize",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Returns a string of blank spaces"
      },
      "SQRT": {
        "nome": "Sqrt",
        "ret": "N",
        "cat": "NUMERO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Calculates the square root of a number."
      },
      "STOD": {
        "nome": "SToD",
        "ret": "D",
        "cat": "CONVERSAO",
        "src": "manual",
        "args": [
          {
            "n": "cDate",
            "t": "C",
            "opc": true
          }
        ],
        "one": "Convert a date string in yyyymmdd format to a date value"
      },
      "STR": {
        "nome": "Str",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          },
          {
            "n": "nLength",
            "t": "N",
            "opc": true
          },
          {
            "n": "nDecimals",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Convert a numeric expression to a character string."
      },
      "STRTRAN": {
        "nome": "StrTran",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "cLocString",
            "t": "C",
            "opc": false
          },
          {
            "n": "cRepString",
            "t": "C",
            "opc": true
          },
          {
            "n": "nPos",
            "t": "N",
            "opc": true
          },
          {
            "n": "nOccurrences",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Translate substring value with a main string"
      },
      "STRZERO": {
        "nome": "StrZero",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "nNumber",
            "t": "N",
            "opc": false
          },
          {
            "n": "nLength",
            "t": "N",
            "opc": true
          },
          {
            "n": "nDecimals",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Convert a numeric expression to a character string, zero padded."
      },
      "STUFF": {
        "nome": "Stuff",
        "ret": "C",
        "cat": "TEXTO",
        "src": "manual",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "nStart",
            "t": "N",
            "opc": false
          },
          {
            "n": "nDelete",
            "t": "N",
            "opc": false
          },
          {
            "n": "cInsert",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Delete and insert characters in a string"
      },
      "SUBSTR": {
        "nome": "SubStr",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          },
          {
            "n": "nStart",
            "t": "N",
            "opc": false
          },
          {
            "n": "nLen",
            "t": "N",
            "opc": true
          }
        ],
        "one": "Returns a substring from a main string"
      },
      "TIME": {
        "nome": "Time",
        "ret": "C",
        "cat": "DATA",
        "src": "core",
        "args": [],
        "one": "Returns the system time as a string"
      },
      "TRANSFORM": {
        "nome": "Transform",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "xExpression",
            "t": "any",
            "opc": false
          },
          {
            "n": "cTemplate",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Formats a value based on a specific picture template."
      },
      "TRIM": {
        "nome": "Trim",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cExpression",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Remove trailing spaces from a string."
      },
      "TYPE": {
        "nome": "Type",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cExp",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Retrieves the type of an expression"
      },
      "UPPER": {
        "nome": "Upper",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cString",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Converts a character expression to uppercase format"
      },
      "USED": {
        "nome": "Used",
        "ret": "L",
        "cat": "BANCO",
        "src": "core",
        "args": [],
        "one": "Checks whether a database is in use in a work area"
      },
      "VAL": {
        "nome": "Val",
        "ret": "N",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "cNumber",
            "t": "C",
            "opc": false
          }
        ],
        "one": "Convert a number from a character type to numeric"
      },
      "VALTYPE": {
        "nome": "ValType",
        "ret": "C",
        "cat": "TEXTO",
        "src": "core",
        "args": [
          {
            "n": "xExp",
            "t": "any",
            "opc": false
          }
        ],
        "one": "Retrieves the data type of an expression"
      },
      "VERSION": {
        "nome": "Version",
        "ret": "C",
        "cat": "AMBIENTE",
        "src": "core",
        "args": [],
        "one": "Returns the version of Harbour compiler"
      },
      "WORD": {
        "nome": "Word",
        "ret": "N",
        "cat": "CONVERSAO",
        "src": "core",
        "args": [
          {
            "n": "nDouble",
            "t": "N",
            "opc": false
          }
        ],
        "one": "Converts double to integer values."
      },
      "YEAR": {
        "nome": "Year",
        "ret": "N",
        "cat": "DATA",
        "src": "core",
        "args": [
          {
            "n": "dDate",
            "t": "D",
            "opc": false
          }
        ],
        "one": "Extracts the year designator of a given date as a numeric value"
      }
    },
    "aliases": {
      "PAD": "PADR"
    },
    "ocultas": [
      "DISKNAME",
      "FKLABEL",
      "FKMAX",
      "NETNAME",
      "UPDATED"
    ]
  };
})();
