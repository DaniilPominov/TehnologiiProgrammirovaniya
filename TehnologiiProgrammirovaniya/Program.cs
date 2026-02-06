using System;

namespace TehnologiiProgrammirovaniya
{
    //v 10
    internal class Program
    {
        static void Main(string[] args)
        {
            var input = Console.ReadLine();

            var delimPos = input.IndexOf(':');

            var objType = input.Substring(0, delimPos);

            var preparsed = new string(input.Skip(delimPos+1).ToArray());

            var parsed = preparsed.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            (var date, var time, var name) = (DateOnly.Parse(parsed![0]), TimeOnly.Parse(parsed[1]), parsed[2].Replace("\"", ""));

            var dto = new ADTO() { Date = date, Time = time, Name = name, ObjType =  objType};

            Console.WriteLine("Created "+dto);
            Console.WriteLine($"{dto.ObjType}, {dto.Date}, {dto.Time}, {dto.Name}");

        }
    }
    public class ADTO
    {
        public string ObjType { get; set; } = null!;
        public DateOnly Date { get; set; }
        public TimeOnly Time { get; set; }
        public string Name { get; set; } = null!;
    }
}
