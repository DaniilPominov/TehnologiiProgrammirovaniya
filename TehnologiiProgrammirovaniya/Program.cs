using System;
using System.Text;

namespace TehnologiiProgrammirovaniya
{
    //v 10
    internal class Program
    {
        static void Main(string[] args)
        {
            var input = "Учебные заняти 2: 2004.11.11    12:30 \"Иван Иваныч ааа\"";//Console.ReadLine();

            var delimPos = input.IndexOf(':');

            var objType = input.Substring(0, delimPos);

            var preparsed = new string(input.Skip(delimPos + 1).ToArray());

            var splited = preparsed.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            var name = getName(splited);

            (var date, var time) = (DateOnly.Parse(splited![0]), TimeOnly.Parse(splited[1]));

            var dto = new ADTO() { Date = date, Time = time, Name = name, ObjType = objType };

            Console.WriteLine($"{dto.ObjType}, {dto.Date}, {dto.Time}, {dto.Name}");

            char[,] starMap =
                { {'*','-','-' },
                { '-','-','-'},
                { '-','-','-'} };

            var newMap = moveStar(starMap, Actions.Left);
            for (int i = 0; i < newMap.GetLength(0); i++)
            {
                for (int j = 0; j < newMap.GetLength(1); j++)
                {
                    Console.Write(newMap[i,j].ToString());
                }
                Console.WriteLine();
            }

        }
        //массив с пробелами и одной *, принимает значение перечислимого типа right,up,left,down, двигает звездочку
        private enum Actions
        {
            Up,
            Down,
            Left,
            Right
        }
        private static char[,] moveStar(char[,] starMatrix, Actions currentAction)
        {
            var n = starMatrix.GetLength(0);
            var m = starMatrix.GetLength(1);
            for (int i = 0; i < n; i++)
            {
                for (int j = 0; j < m; j++)
                {
                    if (starMatrix[i,j] == '*')
                    {
                        starMatrix[i,j] = '-';
                        switch (currentAction)
                        {
                            case Actions.Up:
                                starMatrix[(i - 1) % n,j] = '*';
                                return starMatrix;
                            case Actions.Down:
                                starMatrix[(i + 1) % n,j] = '*';
                                return starMatrix;
                            case Actions.Left:
                                starMatrix[i,(j - 1) % m] = '*';
                                return starMatrix;
                            case Actions.Right:
                                starMatrix[i,(j + 1) % m] = '*';
                                return starMatrix;
                        }
                    }
                }

            }
            return starMatrix;

        }


        private static string getName(string[] splited)
        {
            var nameCount = 0;

            StringBuilder sb = new StringBuilder();

            foreach (var item in splited)
            {
                if (item.Contains("\""))
                {
                    nameCount += 1;
                }
                if (nameCount <= 2 && nameCount > 0) sb.Append(item + " ");
            }
            return sb.ToString().Trim().Replace("\"", "");

        }
        public class ADTO
        {
            public string ObjType { get; set; } = null!;
            public DateOnly Date { get; set; }
            public TimeOnly Time { get; set; }
            public string Name { get; set; } = null!;
        }
    }
}
